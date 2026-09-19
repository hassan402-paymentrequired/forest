<?php

use App\Enums\TermName;
use App\Models\AcademicSession;
use App\Models\AcademicTerm;
use App\Models\School;
use App\Models\SchoolUser;

test('guests are redirected to the school login page', function () {
    $session = AcademicSession::factory()->create();

    $response = $this->post(route('academic-terms.store', $session), [
        'name' => 'first_term',
        'start_date' => $session->start_date,
        'end_date' => $session->start_date->addMonths(3),
    ]);

    $response->assertRedirect(route('school.login'));
});

test('a school user can add a term to one of their own academic sessions', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $session = AcademicSession::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('academic-terms.store', $session), [
        'name' => 'first_term',
        'start_date' => $session->start_date->toDateString(),
        'end_date' => $session->start_date->addMonths(3)->toDateString(),
    ]);

    $response->assertRedirect(route('academic-sessions.index'));

    $term = AcademicTerm::withoutGlobalScopes()->sole();
    expect($term->school_id)->toBe($school->id);
    expect($term->academic_session_id)->toBe($session->id);
    expect($term->name)->toBe(TermName::FirstTerm);
    expect($term->is_current)->toBeFalse();
});

test('a school user cannot add a term to another school\'s session', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherSession = AcademicSession::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('academic-terms.store', $otherSession), [
        'name' => 'first_term',
        'start_date' => $otherSession->start_date->toDateString(),
        'end_date' => $otherSession->start_date->addMonths(3)->toDateString(),
    ]);

    $response->assertNotFound();
    expect(AcademicTerm::withoutGlobalScopes()->count())->toBe(0);
});

test('adding a term requires a valid name and date range', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $session = AcademicSession::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('academic-terms.store', $session), [
        'name' => 'not-a-real-term',
        'start_date' => $session->start_date->toDateString(),
        'end_date' => $session->start_date->subDay()->toDateString(),
    ]);

    $response->assertSessionHasErrors(['name', 'end_date']);
});

test('a term name must be unique within its session', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $session = AcademicSession::factory()->for($school)->create();
    AcademicTerm::factory()->for($school)->for($session, 'academicSession')->create(['name' => 'first_term']);

    $response = $this->actingAs($schoolUser, 'school')->post(route('academic-terms.store', $session), [
        'name' => 'first_term',
        'start_date' => $session->start_date->toDateString(),
        'end_date' => $session->start_date->addMonths(3)->toDateString(),
    ]);

    $response->assertSessionHasErrors('name');
});

test('a school user can update a term\'s details', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $session = AcademicSession::factory()->for($school)->create();
    $term = AcademicTerm::factory()->for($school)->for($session, 'academicSession')->create(['name' => 'first_term']);

    $response = $this->actingAs($schoolUser, 'school')->put(route('academic-terms.update', $term), [
        'name' => 'second_term',
        'start_date' => $term->start_date->toDateString(),
        'end_date' => $term->end_date->toDateString(),
    ]);

    $response->assertRedirect(route('academic-sessions.index'));
    expect($term->fresh()->name)->toBe(TermName::SecondTerm);
});

test('a school user cannot update a term belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherSession = AcademicSession::factory()->for($otherSchool)->create();
    $otherTerm = AcademicTerm::factory()->for($otherSchool)->for($otherSession, 'academicSession')->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('academic-terms.update', $otherTerm), [
        'name' => 'second_term',
        'start_date' => $otherTerm->start_date->toDateString(),
        'end_date' => $otherTerm->end_date->toDateString(),
    ]);

    $response->assertNotFound();
});

test('marking a term current unsets any other current term for the same school, but not other schools\'', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $session = AcademicSession::factory()->for($school)->create();
    $currentTerm = AcademicTerm::factory()->for($school)->for($session, 'academicSession')->current()->create(['name' => 'first_term']);
    $newTerm = AcademicTerm::factory()->for($school)->for($session, 'academicSession')->create(['name' => 'second_term']);

    $otherSchool = School::factory()->create();
    $otherSession = AcademicSession::factory()->for($otherSchool)->create();
    $otherCurrentTerm = AcademicTerm::factory()->for($otherSchool)->for($otherSession, 'academicSession')->current()->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('academic-terms.mark-current', $newTerm));

    $response->assertRedirect(route('academic-sessions.index'));
    expect($newTerm->fresh()->is_current)->toBeTrue();
    expect($currentTerm->fresh()->is_current)->toBeFalse();
    expect($otherCurrentTerm->fresh()->is_current)->toBeTrue();
});

test('terms cannot be removed', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $term = AcademicTerm::factory()->for($school)->create();

    $this->actingAs($schoolUser, 'school')->delete("/academic-terms/{$term->id}")->assertStatus(405);

    expect(AcademicTerm::withoutGlobalScopes()->find($term->id))->not->toBeNull();
});
