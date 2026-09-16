<?php

use App\Enums\AttendanceStatus;
use App\Models\AcademicSession;
use App\Models\AcademicTerm;
use App\Models\Attendance;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\Student;

/**
 * @return array{session: AcademicSession, term: AcademicTerm}
 */
function setUpCurrentTerm(School $school): array
{
    $session = AcademicSession::factory()->for($school)->create();
    $term = AcademicTerm::factory()->for($school)->for($session, 'academicSession')->current()->create();

    return ['session' => $session, 'term' => $term];
}

test('guests are redirected to the school login page', function () {
    $response = $this->get(route('attendance.index'));

    $response->assertRedirect(route('school.login'));
});

test('the roster is empty until a class is selected', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    setUpCurrentTerm($school);

    $response = $this->actingAs($schoolUser, 'school')->get(route('attendance.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('roster', [])
        ->where('current_term', true));
});

test('the roster shows only students enrolled in the selected class for the current session, scoped to the school', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['session' => $session] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $enrolledStudent = Student::factory()->for($school)->create(['name' => 'Chidinma Okafor']);
    Enrollment::factory()->for($school)->create([
        'student_id' => $enrolledStudent->id,
        'school_class_id' => $class->id,
        'academic_session_id' => $session->id,
    ]);

    $unenrolledStudent = Student::factory()->for($school)->create();

    $otherSchool = School::factory()->create();
    $otherSession = AcademicSession::factory()->for($otherSchool)->create();
    $otherClass = SchoolClass::factory()->for($otherSchool)->create();
    $otherStudent = Student::factory()->for($otherSchool)->create();
    Enrollment::factory()->for($otherSchool)->create([
        'student_id' => $otherStudent->id,
        'school_class_id' => $otherClass->id,
        'academic_session_id' => $otherSession->id,
    ]);

    $response = $this->actingAs($schoolUser, 'school')->get(route('attendance.index', ['class_id' => $class->id]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('roster', 1)
        ->where('roster.0.student_id', $enrolledStudent->id)
        ->where('roster.0.status', AttendanceStatus::Present->value)
        ->where('stats.total', 1));

    expect($unenrolledStudent)->not->toBeNull();
});

test('a school user can save attendance for a class roster', function () {
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

    $response = $this->actingAs($schoolUser, 'school')->post(route('attendance.store'), [
        'class_id' => $class->id,
        'date' => today()->toDateString(),
        'records' => [
            ['student_id' => $student->id, 'status' => 'absent'],
        ],
    ]);

    $response->assertRedirect();

    $attendance = Attendance::withoutGlobalScopes()->sole();
    expect($attendance->student_id)->toBe($student->id);
    expect($attendance->school_class_id)->toBe($class->id);
    expect($attendance->academic_term_id)->toBe($term->id);
    expect($attendance->status)->toBe(AttendanceStatus::Absent);
    expect($attendance->date->toDateString())->toBe(today()->toDateString());
});

test('saving attendance again for the same date updates the existing record instead of duplicating it', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['session' => $session] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create();
    Enrollment::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_session_id' => $session->id,
    ]);

    $payload = [
        'class_id' => $class->id,
        'date' => today()->toDateString(),
        'records' => [['student_id' => $student->id, 'status' => 'present']],
    ];

    $this->actingAs($schoolUser, 'school')->post(route('attendance.store'), $payload);
    $this->actingAs($schoolUser, 'school')->post(route('attendance.store'), [
        ...$payload,
        'records' => [['student_id' => $student->id, 'status' => 'late']],
    ]);

    $records = Attendance::withoutGlobalScopes()->where('student_id', $student->id)->get();
    expect($records)->toHaveCount(1);
    expect($records->first()->status)->toBe(AttendanceStatus::Late);
});

test('attendance cannot be saved when the school has no current academic term', function () {
    $schoolUser = SchoolUser::factory()->create();
    $class = SchoolClass::factory()->for($schoolUser->school)->create();
    $student = Student::factory()->for($schoolUser->school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('attendance.store'), [
        'class_id' => $class->id,
        'date' => today()->toDateString(),
        'records' => [['student_id' => $student->id, 'status' => 'present']],
    ]);

    $response->assertSessionHasErrors('class_id');
    expect(Attendance::withoutGlobalScopes()->count())->toBe(0);
});

test('attendance date must fall within the current term', function () {
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

    $response = $this->actingAs($schoolUser, 'school')->post(route('attendance.store'), [
        'class_id' => $class->id,
        'date' => $term->start_date->subDays(5)->toDateString(),
        'records' => [['student_id' => $student->id, 'status' => 'present']],
    ]);

    $response->assertSessionHasErrors('date');
});

test('attendance cannot be recorded for a student not enrolled in the given class', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $unenrolledStudent = Student::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('attendance.store'), [
        'class_id' => $class->id,
        'date' => today()->toDateString(),
        'records' => [['student_id' => $unenrolledStudent->id, 'status' => 'present']],
    ]);

    $response->assertSessionHasErrors('records.0.student_id');
    expect(Attendance::withoutGlobalScopes()->count())->toBe(0);
});

test('a school user cannot save attendance for another school\'s class', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    ['session' => $otherSession] = setUpCurrentTerm($otherSchool);
    $otherClass = SchoolClass::factory()->for($otherSchool)->create();
    $otherStudent = Student::factory()->for($otherSchool)->create();
    Enrollment::factory()->for($otherSchool)->create([
        'student_id' => $otherStudent->id,
        'school_class_id' => $otherClass->id,
        'academic_session_id' => $otherSession->id,
    ]);

    $response = $this->actingAs($schoolUser, 'school')->post(route('attendance.store'), [
        'class_id' => $otherClass->id,
        'date' => today()->toDateString(),
        'records' => [['student_id' => $otherStudent->id, 'status' => 'present']],
    ]);

    $response->assertSessionHasErrors('class_id');
    expect(Attendance::withoutGlobalScopes()->count())->toBe(0);
});
