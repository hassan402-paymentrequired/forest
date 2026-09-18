<?php

use App\Models\Grade;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\Subject;
use App\Models\Teacher;

test('guests are redirected to the school login page', function () {
    $response = $this->get(route('subjects.index'));

    $response->assertRedirect(route('school.login'));
});

test('guests are redirected to the school login page when viewing a subject', function () {
    $subject = Subject::factory()->create();

    $response = $this->get(route('subjects.show', $subject));

    $response->assertRedirect(route('school.login'));
});

test('a school user can view a subject\'s qualified teachers and grade history', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['term' => $term] = setUpCurrentTerm($school);
    $subject = Subject::factory()->for($school)->create(['name' => 'Mathematics']);
    $teacher = Teacher::factory()->for($school)->create(['name' => 'Mr. Adewale']);
    $teacher->subjects()->attach($subject->id);
    $class = SchoolClass::factory()->for($school)->create(['name' => 'JSS 1A']);
    Grade::factory()->for($school)->create([
        'subject_id' => $subject->id,
        'school_class_id' => $class->id,
        'academic_term_id' => $term->id,
        'ca_score' => 30,
        'exam_score' => 50,
    ]);

    $response = $this->actingAs($schoolUser, 'school')->get(route('subjects.show', $subject));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('subject.name', 'Mathematics')
        ->has('teachers', 1)
        ->where('teachers.0.name', 'Mr. Adewale')
        ->has('grades_by_term', 1)
        ->where('grades_by_term.0.entries.0.class', 'JSS 1A')
        ->where('grades_by_term.0.entries.0.students_graded', 1)
        ->where('grades_by_term.0.entries.0.average', 80));
});

test('a subject with no qualified teachers or grades shows an empty history', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $subject = Subject::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('subjects.show', $subject));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('teachers', 0)
        ->has('grades_by_term', 0));
});

test('a school user cannot view another school\'s subject', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherSubject = Subject::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('subjects.show', $otherSubject));

    $response->assertNotFound();
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

test('the subject directory shows how many teachers are qualified for each subject', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $subject = Subject::factory()->for($school)->create();
    Teacher::factory()->for($school)->count(2)->create()->each(
        fn (Teacher $teacher) => $teacher->subjects()->attach($subject->id),
    );

    $response = $this->actingAs($schoolUser, 'school')->get(route('subjects.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('subjects.data.0.teachers_count', 2));
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
