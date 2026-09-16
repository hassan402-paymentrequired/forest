<?php

use App\Models\School;
use App\Models\SchoolUser;
use App\Models\Subject;

test('guests are redirected to the school login page', function () {
    $response = $this->get(route('subjects.index'));

    $response->assertRedirect(route('school.login'));
});

test('a school user only sees their own school\'s subjects', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    Subject::factory()->for($school)->count(2)->create();

    $otherSchool = School::factory()->create();
    Subject::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('subjects.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('subjects.data', 2)
        ->where('stats.total', 2));
});

test('a school user can add a subject, scoped to their own school automatically', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('subjects.store'), [
        'name' => 'Mathematics',
    ]);

    $response->assertRedirect(route('subjects.index'));

    $subject = Subject::withoutGlobalScopes()->sole();
    expect($subject->school_id)->toBe($school->id);
    expect($subject->name)->toBe('Mathematics');
});

test('adding a subject requires a name', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('subjects.store'), [
        'name' => '',
    ]);

    $response->assertSessionHasErrors('name');
});

test('two subjects in the same school cannot share a name', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    Subject::factory()->for($school)->create(['name' => 'Mathematics']);

    $response = $this->actingAs($schoolUser, 'school')->post(route('subjects.store'), [
        'name' => 'Mathematics',
    ]);

    $response->assertSessionHasErrors('name');
});

test('a school user can update a subject\'s name', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $subject = Subject::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('subjects.update', $subject), [
        'name' => 'English Language',
    ]);

    $response->assertRedirect(route('subjects.index'));
    expect($subject->fresh()->name)->toBe('English Language');
});

test('a school user cannot update a subject belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherSubject = Subject::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('subjects.update', $otherSubject), [
        'name' => 'Hijacked',
    ]);

    $response->assertNotFound();
    expect($otherSubject->fresh()->name)->not->toBe('Hijacked');
});

test('a school user can remove a subject', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $subject = Subject::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->delete(route('subjects.destroy', $subject));

    $response->assertRedirect(route('subjects.index'));
    expect(Subject::withoutGlobalScopes()->find($subject->id))->toBeNull();
});

test('a school user cannot remove a subject belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherSubject = Subject::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->delete(route('subjects.destroy', $otherSubject));

    $response->assertNotFound();
    expect(Subject::withoutGlobalScopes()->find($otherSubject->id))->not->toBeNull();
});
