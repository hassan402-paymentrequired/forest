<?php

use App\Enums\TeacherStatus;
use App\Models\ClassTeacherAssignment;
use App\Models\Grade;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\Subject;
use App\Models\Teacher;

test('guests are redirected to the school login page', function () {
    $response = $this->get(route('teachers.index'));

    $response->assertRedirect(route('school.login'));
});

test('guests are redirected to the school login page when viewing a teacher', function () {
    $teacher = Teacher::factory()->create();

    $response = $this->get(route('teachers.show', $teacher));

    $response->assertRedirect(route('school.login'));
});

test('a school user can view a teacher\'s profile, class assignments, and recorded grades', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['term' => $term] = setUpCurrentTerm($school);
    $teacher = Teacher::factory()->for($school)->create(['name' => 'Mr. Adewale']);
    $class = SchoolClass::factory()->for($school)->create();
    ClassTeacherAssignment::factory()->for($school)->create([
        'school_class_id' => $class->id,
        'teacher_id' => $teacher->id,
        'academic_term_id' => $term->id,
    ]);
    $subject = Subject::factory()->for($school)->create(['name' => 'Mathematics']);
    Grade::factory()->for($school)->create([
        'teacher_id' => $teacher->id,
        'subject_id' => $subject->id,
        'school_class_id' => $class->id,
        'academic_term_id' => $term->id,
        'ca_score' => 30,
        'exam_score' => 50,
    ]);

    $response = $this->actingAs($schoolUser, 'school')->get(route('teachers.show', $teacher));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('teacher.name', 'Mr. Adewale')
        ->has('class_assignments', 1)
        ->where('class_assignments.0.class.id', $class->id)
        ->where('class_assignments.0.is_current', true)
        ->has('grades_by_term', 1)
        ->where('grades_by_term.0.entries.0.subject', 'Mathematics')
        ->where('grades_by_term.0.entries.0.students_graded', 1)
        ->where('grades_by_term.0.entries.0.average', 80));
});

test('a teacher with no class assignments or grades shows an empty history', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('teachers.show', $teacher));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('class_assignments', 0)
        ->has('grades_by_term', 0));
});

test('a school user cannot view another school\'s teacher', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherTeacher = Teacher::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('teachers.show', $otherTeacher));

    $response->assertNotFound();
});

test('a school user only sees their own school\'s teachers', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    Teacher::factory()->for($school)->count(2)->create();

    $otherSchool = School::factory()->create();
    Teacher::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('teachers.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('teachers.data', 2)
        ->where('stats.total', 2));
});

test('the teacher directory shows each teacher\'s current-term class assignment', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['term' => $term] = setUpCurrentTerm($school);
    $teacher = Teacher::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create(['name' => 'JSS 1A']);
    ClassTeacherAssignment::factory()->for($school)->create([
        'school_class_id' => $class->id,
        'teacher_id' => $teacher->id,
        'academic_term_id' => $term->id,
    ]);

    $response = $this->actingAs($schoolUser, 'school')->get(route('teachers.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('teachers.data.0.classes.0.name', 'JSS 1A'));
});

test('a school user can add a teacher, scoped to their own school automatically', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $mathematics = Subject::factory()->for($school)->create(['name' => 'Mathematics']);
    $physics = Subject::factory()->for($school)->create(['name' => 'Physics']);

    $response = $this->actingAs($schoolUser, 'school')->post(route('teachers.store'), [
        'name' => 'Mrs. Adebayo',
        'email' => 'adebayo@example.com',
        'phone' => '08012345678',
        'subject_ids' => [$mathematics->id, $physics->id],
    ]);

    $response->assertRedirect(route('teachers.index'));

    $teacher = Teacher::withoutGlobalScopes()->sole();
    expect($teacher->school_id)->toBe($school->id);
    expect($teacher->name)->toBe('Mrs. Adebayo');
    expect($teacher->subjects()->pluck('name')->sort()->values()->all())->toBe(['Mathematics', 'Physics']);
    expect($teacher->status)->toBe(TeacherStatus::Active);
});

test('a teacher cannot be assigned a subject from another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherSubject = Subject::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('teachers.store'), [
        'name' => 'Mrs. Adebayo',
        'subject_ids' => [$otherSubject->id],
    ]);

    $response->assertSessionHasErrors('subject_ids.0');
    expect(Teacher::withoutGlobalScopes()->count())->toBe(0);
});

test('adding a teacher requires a name', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('teachers.store'), [
        'name' => '',
    ]);

    $response->assertSessionHasErrors('name');
});

test('a school user can update a teacher\'s status and subjects', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create();
    $subject = Subject::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('teachers.update', $teacher), [
        'name' => $teacher->name,
        'email' => $teacher->email,
        'phone' => $teacher->phone,
        'subject_ids' => [$subject->id],
        'status' => TeacherStatus::OnLeave->value,
    ]);

    $response->assertRedirect(route('teachers.index'));
    expect($teacher->fresh()->status)->toBe(TeacherStatus::OnLeave);
    expect($teacher->subjects()->pluck('subjects.id')->all())->toBe([$subject->id]);
});

test('a school user cannot update a teacher belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherTeacher = Teacher::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('teachers.update', $otherTeacher), [
        'name' => 'Hijacked',
        'status' => TeacherStatus::Inactive->value,
    ]);

    $response->assertNotFound();
    expect($otherTeacher->fresh()->name)->not->toBe('Hijacked');
});

test('a school user can remove a teacher', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->delete(route('teachers.destroy', $teacher));

    $response->assertRedirect(route('teachers.index'));
    expect(Teacher::withoutGlobalScopes()->find($teacher->id))->toBeNull();
});

test('a school user cannot remove a teacher belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherTeacher = Teacher::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->delete(route('teachers.destroy', $otherTeacher));

    $response->assertNotFound();
    expect(Teacher::withoutGlobalScopes()->find($otherTeacher->id))->not->toBeNull();
});
