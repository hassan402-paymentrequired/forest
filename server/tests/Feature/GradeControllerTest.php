<?php

use App\Enums\GradeLetter;
use App\Enums\TeacherStatus;
use App\Models\AcademicSession;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;

test('guests are redirected to the school login page', function () {
    $response = $this->get(route('grades.index'));

    $response->assertRedirect(route('school.login'));
});

test('the roster is empty until a class and subject are selected', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    setUpCurrentTerm($school);

    $response = $this->actingAs($schoolUser, 'school')->get(route('grades.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->where('roster', []));
});

test('the roster shows only students enrolled in the selected class for the current session, scoped to the school', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['session' => $session] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $subject = Subject::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create(['name' => 'Chidinma Okafor']);
    Enrollment::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_session_id' => $session->id,
    ]);

    $otherSchool = School::factory()->create();
    $otherSession = AcademicSession::factory()->for($otherSchool)->create();
    $otherClass = SchoolClass::factory()->for($otherSchool)->create();
    $otherStudent = Student::factory()->for($otherSchool)->create();
    Enrollment::factory()->for($otherSchool)->create([
        'student_id' => $otherStudent->id,
        'school_class_id' => $otherClass->id,
        'academic_session_id' => $otherSession->id,
    ]);

    $response = $this->actingAs($schoolUser, 'school')->get(route('grades.index', [
        'class_id' => $class->id,
        'subject_id' => $subject->id,
    ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('roster', 1)
        ->where('roster.0.student_id', $student->id)
        ->where('roster.0.ca_score', 0)
        ->where('roster.0.exam_score', 0));
});

test('a school user can save grades for a class roster and the total/grade are computed', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['session' => $session, 'term' => $term] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $subject = Subject::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create();
    Enrollment::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_session_id' => $session->id,
    ]);

    $response = $this->actingAs($schoolUser, 'school')->post(route('grades.store'), [
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'teacher_id' => $teacher->id,
        'records' => [
            ['student_id' => $student->id, 'ca_score' => 35, 'exam_score' => 45],
        ],
    ]);

    $response->assertRedirect();

    $grade = Grade::withoutGlobalScopes()->sole();
    expect($grade->student_id)->toBe($student->id);
    expect($grade->subject_id)->toBe($subject->id);
    expect($grade->school_class_id)->toBe($class->id);
    expect($grade->academic_term_id)->toBe($term->id);
    expect($grade->teacher_id)->toBe($teacher->id);
    expect($grade->ca_score)->toBe(35);
    expect($grade->exam_score)->toBe(45);
    expect($grade->total)->toBe(80);
    expect($grade->grade)->toBe(GradeLetter::A);
});

test('saving grades again for the same subject and term updates the existing record instead of duplicating it', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['session' => $session] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $subject = Subject::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create();
    Enrollment::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_session_id' => $session->id,
    ]);

    $payload = [
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'records' => [['student_id' => $student->id, 'ca_score' => 20, 'exam_score' => 20]],
    ];

    $this->actingAs($schoolUser, 'school')->post(route('grades.store'), $payload);
    $this->actingAs($schoolUser, 'school')->post(route('grades.store'), [
        ...$payload,
        'records' => [['student_id' => $student->id, 'ca_score' => 10, 'exam_score' => 15]],
    ]);

    $records = Grade::withoutGlobalScopes()->where('student_id', $student->id)->get();
    expect($records)->toHaveCount(1);
    expect($records->first()->total)->toBe(25);
    expect($records->first()->grade)->toBe(GradeLetter::F);
});

test('grades cannot be saved when the school has no current academic term', function () {
    $schoolUser = SchoolUser::factory()->create();
    $class = SchoolClass::factory()->for($schoolUser->school)->create();
    $subject = Subject::factory()->for($schoolUser->school)->create();
    $student = Student::factory()->for($schoolUser->school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('grades.store'), [
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'records' => [['student_id' => $student->id, 'ca_score' => 20, 'exam_score' => 20]],
    ]);

    $response->assertSessionHasErrors('class_id');
    expect(Grade::withoutGlobalScopes()->count())->toBe(0);
});

test('grades cannot be recorded for a student not enrolled in the given class', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $subject = Subject::factory()->for($school)->create();
    $unenrolledStudent = Student::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('grades.store'), [
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'records' => [['student_id' => $unenrolledStudent->id, 'ca_score' => 20, 'exam_score' => 20]],
    ]);

    $response->assertSessionHasErrors('records.0.student_id');
    expect(Grade::withoutGlobalScopes()->count())->toBe(0);
});

test('ca and exam scores are capped to their maximums', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['session' => $session] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $subject = Subject::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create();
    Enrollment::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_session_id' => $session->id,
    ]);

    $response = $this->actingAs($schoolUser, 'school')->post(route('grades.store'), [
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'records' => [['student_id' => $student->id, 'ca_score' => 41, 'exam_score' => 61]],
    ]);

    $response->assertSessionHasErrors(['records.0.ca_score', 'records.0.exam_score']);
});

test('a school user cannot save grades for another school\'s class', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    ['session' => $otherSession] = setUpCurrentTerm($otherSchool);
    $otherClass = SchoolClass::factory()->for($otherSchool)->create();
    $otherSubject = Subject::factory()->for($otherSchool)->create();
    $otherStudent = Student::factory()->for($otherSchool)->create();
    Enrollment::factory()->for($otherSchool)->create([
        'student_id' => $otherStudent->id,
        'school_class_id' => $otherClass->id,
        'academic_session_id' => $otherSession->id,
    ]);

    $response = $this->actingAs($schoolUser, 'school')->post(route('grades.store'), [
        'class_id' => $otherClass->id,
        'subject_id' => $otherSubject->id,
        'records' => [['student_id' => $otherStudent->id, 'ca_score' => 20, 'exam_score' => 20]],
    ]);

    $response->assertSessionHasErrors(['class_id', 'subject_id']);
    expect(Grade::withoutGlobalScopes()->count())->toBe(0);
});

test('the grade page only offers active classes, subjects, and teachers', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    SchoolClass::factory()->for($school)->create(['name' => 'JSS 1A']);
    SchoolClass::factory()->for($school)->inactive()->create();
    Subject::factory()->for($school)->create(['name' => 'Mathematics']);
    Subject::factory()->for($school)->inactive()->create(['name' => 'Latin']);
    Teacher::factory()->for($school)->create(['name' => 'Mrs. Adebayo']);
    Teacher::factory()->for($school)->create(['status' => TeacherStatus::Inactive]);

    $this->actingAs($schoolUser, 'school')->get(route('grades.index'))->assertInertia(fn ($page) => $page
        ->has('classes', 1)
        ->has('subjects', 1)
        ->has('teachers', 1)
        ->where('teachers.0.name', 'Mrs. Adebayo'));
});

test('grades cannot be attributed to an inactive teacher', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['session' => $session] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $subject = Subject::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create(['status' => TeacherStatus::Inactive]);
    $student = Student::factory()->for($school)->create();
    Enrollment::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_session_id' => $session->id,
    ]);

    $this->actingAs($schoolUser, 'school')->post(route('grades.store'), [
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'teacher_id' => $teacher->id,
        'records' => [['student_id' => $student->id, 'ca_score' => 10, 'exam_score' => 20]],
    ])->assertSessionHasErrors('teacher_id');
});
