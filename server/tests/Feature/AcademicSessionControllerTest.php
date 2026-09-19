<?php

use App\Models\AcademicSession;
use App\Models\School;
use App\Models\SchoolUser;

test('guests are redirected to the school login page', function () {
    $response = $this->get(route('academic-sessions.index'));

    $response->assertRedirect(route('school.login'));
});

test('a school user only sees their own school\'s academic sessions with nested terms', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $session = AcademicSession::factory()->for($school)->create();
    $term = $session->terms()->create([
        'school_id' => $school->id,
        'name' => 'first_term',
        'start_date' => $session->start_date,
        'end_date' => $session->start_date->addMonths(3),
    ]);

    $otherSchool = School::factory()->create();
    AcademicSession::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('academic-sessions.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('sessions', 1)
        ->where('sessions.0.id', $session->id)
        ->has('sessions.0.terms', 1)
        ->where('sessions.0.terms.0.id', $term->id)
        ->where('stats.total', 1));
});

test('a school user can add an academic session, scoped to their own school automatically', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('academic-sessions.store'), [
        'name' => '2025/2026',
        'start_date' => '2025-09-01',
        'end_date' => '2026-07-31',
    ]);

    $response->assertRedirect(route('academic-sessions.index'));

    $session = AcademicSession::withoutGlobalScopes()->sole();
    expect($session->school_id)->toBe($school->id);
    expect($session->name)->toBe('2025/2026');
});

test('adding an academic session requires a name and valid date range', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('academic-sessions.store'), [
        'name' => '',
        'start_date' => '2025-09-01',
        'end_date' => '2025-01-01',
    ]);

    $response->assertSessionHasErrors(['name', 'end_date']);
});

test('two academic sessions in the same school cannot share a name', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    AcademicSession::factory()->for($school)->create(['name' => '2025/2026']);

    $response = $this->actingAs($schoolUser, 'school')->post(route('academic-sessions.store'), [
        'name' => '2025/2026',
        'start_date' => '2025-09-01',
        'end_date' => '2026-07-31',
    ]);

    $response->assertSessionHasErrors('name');
});

test('a school user can update an academic session\'s details', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $session = AcademicSession::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('academic-sessions.update', $session), [
        'name' => '2026/2027',
        'start_date' => '2026-09-01',
        'end_date' => '2027-07-31',
    ]);

    $response->assertRedirect(route('academic-sessions.index'));
    expect($session->fresh()->name)->toBe('2026/2027');
});

test('a school user cannot update an academic session belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherSession = AcademicSession::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('academic-sessions.update', $otherSession), [
        'name' => 'Hijacked',
        'start_date' => '2026-09-01',
        'end_date' => '2027-07-31',
    ]);

    $response->assertNotFound();
    expect($otherSession->fresh()->name)->not->toBe('Hijacked');
});

test('academic sessions cannot be removed', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $session = AcademicSession::factory()->for($school)->create();

    $this->actingAs($schoolUser, 'school')->delete("/academic-sessions/{$session->id}")->assertStatus(405);

    expect(AcademicSession::withoutGlobalScopes()->find($session->id))->not->toBeNull();
});
