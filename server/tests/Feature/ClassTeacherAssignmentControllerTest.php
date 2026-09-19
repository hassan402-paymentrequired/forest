<?php

use App\Enums\TeacherStatus;
use App\Models\ClassTeacherAssignment;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\Teacher;

test('guests are redirected to the school login page', function () {
    $class = SchoolClass::factory()->create();

    $response = $this->post(route('classes.teacher.store', $class));

    $response->assertRedirect(route('school.login'));
});

test('a school user can assign a class teacher for the current term', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['term' => $term] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('classes.teacher.store', $class), [
        'teacher_id' => $teacher->id,
    ]);

    $response->assertRedirect(route('classes.show', $class));

    $assignment = ClassTeacherAssignment::withoutGlobalScopes()->sole();
    expect($assignment->school_class_id)->toBe($class->id);
    expect($assignment->teacher_id)->toBe($teacher->id);
    expect($assignment->academic_term_id)->toBe($term->id);
});

test('assigning a class teacher again for the same term updates the existing assignment instead of duplicating it', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $firstTeacher = Teacher::factory()->for($school)->create();
    $secondTeacher = Teacher::factory()->for($school)->create();

    $this->actingAs($schoolUser, 'school')->post(route('classes.teacher.store', $class), [
        'teacher_id' => $firstTeacher->id,
    ]);
    $this->actingAs($schoolUser, 'school')->post(route('classes.teacher.store', $class), [
        'teacher_id' => $secondTeacher->id,
    ]);

    $assignments = ClassTeacherAssignment::withoutGlobalScopes()->where('school_class_id', $class->id)->get();
    expect($assignments)->toHaveCount(1);
    expect($assignments->first()->teacher_id)->toBe($secondTeacher->id);
});

test('a class teacher cannot be assigned without a current academic term', function () {
    $schoolUser = SchoolUser::factory()->create();
    $class = SchoolClass::factory()->for($schoolUser->school)->create();
    $teacher = Teacher::factory()->for($schoolUser->school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('classes.teacher.store', $class), [
        'teacher_id' => $teacher->id,
    ]);

    $response->assertSessionHasErrors('teacher_id');
    expect(ClassTeacherAssignment::withoutGlobalScopes()->count())->toBe(0);
});

test('a school user cannot assign a teacher from another school', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $otherSchool = School::factory()->create();
    $otherTeacher = Teacher::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('classes.teacher.store', $class), [
        'teacher_id' => $otherTeacher->id,
    ]);

    $response->assertSessionHasErrors('teacher_id');
    expect(ClassTeacherAssignment::withoutGlobalScopes()->count())->toBe(0);
});

test('a school user cannot assign a teacher to another school\'s class', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    setUpCurrentTerm($otherSchool);
    $otherClass = SchoolClass::factory()->for($otherSchool)->create();
    $otherTeacher = Teacher::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('classes.teacher.store', $otherClass), [
        'teacher_id' => $otherTeacher->id,
    ]);

    $response->assertNotFound();
});

test('a class teacher assignment cannot be removed, only reassigned', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create();

    $this->actingAs($schoolUser, 'school')->delete("/classes/{$class->id}/teacher")->assertStatus(405);
});

test('an inactive teacher cannot be assigned as a class teacher', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create(['status' => TeacherStatus::Inactive]);

    $this->actingAs($schoolUser, 'school')
        ->post(route('classes.teacher.store', $class), ['teacher_id' => $teacher->id])
        ->assertSessionHasErrors('teacher_id');
});
