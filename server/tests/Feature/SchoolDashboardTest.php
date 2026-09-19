<?php

use App\Enums\AttendanceStatus;
use App\Enums\StudentStatus;
use App\Enums\TeacherStatus;
use App\Models\Attendance;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Guardian;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;

test('guests are redirected to the school login page', function () {
    $this->get(route('school.dashboard'))->assertRedirect(route('school.login'));
});

test('the dashboard summarises only the school\'s active records', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    Student::factory()->for($school)->count(2)->create();
    Student::factory()->for($school)->create(['status' => StudentStatus::Withdrawn]);
    Teacher::factory()->for($school)->create();
    Teacher::factory()->for($school)->create(['status' => TeacherStatus::Inactive]);
    Guardian::factory()->for($school)->create();
    Guardian::factory()->for($school)->inactive()->create();
    SchoolClass::factory()->for($school)->create();
    SchoolClass::factory()->for($school)->inactive()->create();
    Student::factory()->for(School::factory()->create())->create();

    $this->actingAs($schoolUser, 'school')->get(route('school.dashboard'))->assertInertia(fn ($page) => $page
        ->where('stats.students', 2)
        ->where('stats.teachers', 1)
        ->where('stats.guardians', 1)
        ->where('stats.classes', 1)
        ->where('term', null)
        ->where('attendance.today', null)
        ->where('grades.recorded', 0)
        ->has('class_performance', 0));
});

test('the dashboard shows the current term, attendance, grade performance, and who is on leave', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['session' => $session, 'term' => $term] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create(['name' => 'JSS 1A']);
    $subject = Subject::factory()->for($school)->create();
    $students = Student::factory()->for($school)->count(4)->create();

    foreach ($students as $index => $student) {
        Enrollment::factory()->for($school)->create([
            'student_id' => $student->id,
            'school_class_id' => $class->id,
            'academic_session_id' => $session->id,
        ]);
        Attendance::factory()->for($school)->create([
            'student_id' => $student->id,
            'school_class_id' => $class->id,
            'academic_term_id' => $term->id,
            'date' => today(),
            'status' => $index === 0 ? AttendanceStatus::Absent : AttendanceStatus::Present,
        ]);
        Grade::factory()->for($school)->create([
            'student_id' => $student->id,
            'subject_id' => $subject->id,
            'school_class_id' => $class->id,
            'academic_term_id' => $term->id,
            'ca_score' => $index === 0 ? 5 : 30,
            'exam_score' => $index === 0 ? 5 : 50,
        ]);
    }
    Teacher::factory()->for($school)->onLeave()->create(['name' => 'Mrs. Adebayo']);

    $this->actingAs($schoolUser, 'school')->get(route('school.dashboard'))->assertInertia(fn ($page) => $page
        ->where('term.session_name', $session->name)
        ->where('attendance.today', 75)
        ->where('attendance.term', 75)
        ->has('attendance.trend', 1)
        ->where('grades.recorded', 4)
        ->where('grades.average', 62.5)
        ->where('grades.pass_rate', 75)
        ->where('class_performance.0.name', 'JSS 1A')
        ->where('class_performance.0.average', 62.5)
        ->where('teachers_on_leave.0.name', 'Mrs. Adebayo')
        ->has('recent_students', 4));
});
