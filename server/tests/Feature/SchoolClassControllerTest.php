<?php

use App\Enums\AttendanceStatus;
use App\Enums\RecordStatus;
use App\Models\Attendance;
use App\Models\ClassTeacherAssignment;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;

test('guests are redirected to the school login page', function () {
    $response = $this->get(route('classes.index'));

    $response->assertRedirect(route('school.login'));
});

test('guests are redirected to the school login page when viewing a class', function () {
    $class = SchoolClass::factory()->create();

    $response = $this->get(route('classes.show', $class));

    $response->assertRedirect(route('school.login'));
});

test('a school user can view a class\'s roster, teacher, and attendance summary for the current term', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['session' => $session, 'term' => $term] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create();
    ClassTeacherAssignment::factory()->for($school)->create([
        'school_class_id' => $class->id,
        'teacher_id' => $teacher->id,
        'academic_term_id' => $term->id,
    ]);
    $student = Student::factory()->for($school)->create(['name' => 'Chidinma Okafor']);
    Enrollment::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_session_id' => $session->id,
    ]);
    Attendance::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_term_id' => $term->id,
        'status' => AttendanceStatus::Present,
    ]);

    $response = $this->actingAs($schoolUser, 'school')->get(route('classes.show', $class));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('class.name', $class->name)
        ->where('current_term', true)
        ->where('teacher.id', $teacher->id)
        ->has('roster', 1)
        ->where('roster.0.id', $student->id)
        ->where('roster.0.attendance.present', 1)
        ->where('stats.total_students', 1)
        ->where('stats.attendance_rate', 100));
});

test('a class show page includes a grade summary by subject and an attendance trend for the current term', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['session' => $session, 'term' => $term] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create();
    Enrollment::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_session_id' => $session->id,
    ]);

    $subject = Subject::factory()->for($school)->create(['name' => 'Mathematics']);
    Grade::factory()->for($school)->create([
        'student_id' => $student->id,
        'subject_id' => $subject->id,
        'school_class_id' => $class->id,
        'academic_term_id' => $term->id,
        'ca_score' => 30,
        'exam_score' => 50,
    ]);

    Attendance::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_term_id' => $term->id,
        'date' => today(),
        'status' => AttendanceStatus::Present,
    ]);
    Attendance::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_term_id' => $term->id,
        'date' => today()->subDay(),
        'status' => AttendanceStatus::Absent,
    ]);

    $response = $this->actingAs($schoolUser, 'school')->get(route('classes.show', $class));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('grade_summary', 1)
        ->where('grade_summary.0.subject', 'Mathematics')
        ->where('grade_summary.0.students_graded', 1)
        ->where('grade_summary.0.average', 80)
        ->where('grade_summary.0.passing', 1)
        ->has('attendance_trend', 2)
        ->where('attendance_trend.0.date', today()->toDateString())
        ->where('attendance_trend.0.present', 1)
        ->where('attendance_trend.1.date', today()->subDay()->toDateString())
        ->where('attendance_trend.1.absent', 1));
});

test('a class has no teacher or roster when the school has no current academic term', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('classes.show', $class));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('current_term', false)
        ->where('teacher', null)
        ->has('roster', 0)
        ->has('grade_summary', 0)
        ->has('attendance_trend', 0));
});

test('a school user cannot view another school\'s class', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherClass = SchoolClass::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('classes.show', $otherClass));

    $response->assertNotFound();
});

test('a school user only sees their own school\'s classes', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    SchoolClass::factory()->for($school)->count(2)->create();

    $otherSchool = School::factory()->create();
    SchoolClass::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('classes.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('classes.data', 2)
        ->where('stats.total', 2));
});

test('the class directory shows each class\'s current-term teacher and enrolled student count', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['session' => $session, 'term' => $term] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create(['name' => 'Mr. Adewale']);
    ClassTeacherAssignment::factory()->for($school)->create([
        'school_class_id' => $class->id,
        'teacher_id' => $teacher->id,
        'academic_term_id' => $term->id,
    ]);
    Enrollment::factory()->for($school)->count(2)->create([
        'school_class_id' => $class->id,
        'academic_session_id' => $session->id,
    ]);

    $response = $this->actingAs($schoolUser, 'school')->get(route('classes.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('classes.data.0.teacher.name', 'Mr. Adewale')
        ->where('classes.data.0.students_count', 2));
});

test('a school user can add a class, scoped to their own school automatically', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('classes.store'), [
        'name' => 'JSS 1A',
    ]);

    $response->assertRedirect(route('classes.index'));

    $class = SchoolClass::withoutGlobalScopes()->sole();
    expect($class->school_id)->toBe($school->id);
    expect($class->name)->toBe('JSS 1A');
});

test('adding a class requires a name', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('classes.store'), [
        'name' => '',
    ]);

    $response->assertSessionHasErrors('name');
});

test('a school user can update a class\'s name', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->from(route('classes.show', $class))->put(route('classes.update', $class), [
        'name' => 'JSS 2B',
    ]);

    $response->assertRedirect(route('classes.show', $class));
    expect($class->fresh()->name)->toBe('JSS 2B');
});

test('a school user cannot update a class belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherClass = SchoolClass::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('classes.update', $otherClass), [
        'name' => 'Hijacked',
    ]);

    $response->assertNotFound();
    expect($otherClass->fresh()->name)->not->toBe('Hijacked');
});

test('classs cannot be removed', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create();

    $this->actingAs($schoolUser, 'school')->delete("/classes/{$class->id}")->assertStatus(405);

    expect(SchoolClass::withoutGlobalScopes()->find($class->id))->not->toBeNull();
});

test('a school user can deactivate and reactivate a class', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create();

    $this->actingAs($schoolUser, 'school')
        ->patch(route('classes.status.update', $class), ['status' => RecordStatus::Inactive->value])
        ->assertRedirect();
    expect($class->fresh()->status)->toBe(RecordStatus::Inactive);

    $this->actingAs($schoolUser, 'school')
        ->patch(route('classes.status.update', $class), ['status' => RecordStatus::Active->value])
        ->assertRedirect();
    expect($class->fresh()->status)->toBe(RecordStatus::Active);
});

test('a class status must be valid', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create();

    $this->actingAs($schoolUser, 'school')
        ->patch(route('classes.status.update', $class), ['status' => 'deleted'])
        ->assertSessionHasErrors('status');
});

test('a school user cannot change the status of another school\'s class', function () {
    $schoolUser = SchoolUser::factory()->create();
    $other = SchoolClass::factory()->for(School::factory()->create())->create();

    $this->actingAs($schoolUser, 'school')
        ->patch(route('classes.status.update', $other), ['status' => RecordStatus::Inactive->value])
        ->assertNotFound();

    expect($other->fresh()->status)->toBe(RecordStatus::Active);
});

test('the class directory can be filtered by status and counts active classes', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    SchoolClass::factory()->for($school)->create(['name' => 'JSS 1A']);
    SchoolClass::factory()->for($school)->inactive()->create(['name' => 'JSS 9Z']);

    $this->actingAs($schoolUser, 'school')->get(route('classes.index', ['status' => 'inactive']))->assertInertia(fn ($page) => $page
        ->has('classes.data', 1)
        ->where('classes.data.0.name', 'JSS 9Z')
        ->where('classes.data.0.status', 'inactive')
        ->where('stats.total', 2)
        ->where('stats.active', 1));
});
