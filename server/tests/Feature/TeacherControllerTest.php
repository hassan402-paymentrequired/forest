<?php

use App\Enums\TeacherStatus;
use App\Models\AcademicTerm;
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

test('a teacher\'s profile summarises their join date, students in charge, and grade performance', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['session' => $session, 'term' => $currentTerm] = setUpCurrentTerm($school);
    $olderTerm = AcademicTerm::factory()->for($school)->create([
        'start_date' => $currentTerm->start_date->subYear(),
        'end_date' => $currentTerm->end_date->subYear(),
        'is_current' => false,
    ]);
    $teacher = Teacher::factory()->for($school)->create(['joined_at' => '2022-05-09']);
    $class = SchoolClass::factory()->for($school)->create(['name' => 'JSS 1A']);
    $otherClass = SchoolClass::factory()->for($school)->create();
    $subject = Subject::factory()->for($school)->create(['name' => 'Mathematics']);
    ClassTeacherAssignment::factory()->for($school)->create([
        'school_class_id' => $class->id,
        'teacher_id' => $teacher->id,
        'academic_term_id' => $currentTerm->id,
    ]);
    $inClass = Student::factory()->for($school)->create(['name' => 'Ada Obi']);
    Enrollment::factory()->for($school)->create([
        'student_id' => $inClass->id,
        'school_class_id' => $class->id,
        'academic_session_id' => $session->id,
    ]);
    Enrollment::factory()->for($school)->create([
        'school_class_id' => $otherClass->id,
        'academic_session_id' => $session->id,
    ]);

    $recordGrade = fn (AcademicTerm $term, int $ca, int $exam) => Grade::factory()->for($school)->create([
        'teacher_id' => $teacher->id,
        'subject_id' => $subject->id,
        'school_class_id' => $class->id,
        'academic_term_id' => $term->id,
        'ca_score' => $ca,
        'exam_score' => $exam,
    ]);
    $recordGrade($currentTerm, 30, 50);
    $recordGrade($currentTerm, 10, 20);
    $recordGrade($olderTerm, 20, 40);

    $response = $this->actingAs($schoolUser, 'school')->get(route('teachers.show', $teacher));

    $response->assertInertia(fn ($page) => $page
        ->where('teacher.joined_at', '2022-05-09')
        ->where('teacher.classes.0.name', 'JSS 1A')
        ->has('students', 1)
        ->where('students.0.name', 'Ada Obi')
        ->where('students.0.class_name', 'JSS 1A')
        ->has('subjects')
        ->where('grades_by_term.0.term_id', $currentTerm->id)
        ->where('grades_by_term.0.is_current', true)
        ->where('grades_by_term.0.entries.0.students_graded', 2)
        ->where('grades_by_term.0.entries.0.average', 55)
        ->where('grades_by_term.0.entries.0.pass_rate', 50)
        ->where('grades_by_term.1.term_id', $olderTerm->id)
        ->where('stats.subjects', 0)
        ->where('stats.students', 1)
        ->where('stats.grades_recorded', 3)
        ->where('stats.average', 56.7)
        ->where('stats.pass_rate', 66.7));
});

test('a teacher with no class assignments or grades shows an empty history', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('teachers.show', $teacher));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('class_assignments', 0)
        ->has('grades_by_term', 0)
        ->has('students', 0)
        ->where('stats.average', null)
        ->where('stats.pass_rate', null));
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
        'joined_at' => '2024-09-02',
        'subject_ids' => [$mathematics->id, $physics->id],
    ]);

    $response->assertRedirect(route('teachers.index'));

    $teacher = Teacher::withoutGlobalScopes()->sole();
    expect($teacher->school_id)->toBe($school->id);
    expect($teacher->name)->toBe('Mrs. Adebayo');
    expect($teacher->joined_at->toDateString())->toBe('2024-09-02');
    expect($teacher->subjects()->pluck('name')->sort()->values()->all())->toBe(['Mathematics', 'Physics']);
    expect($teacher->status)->toBe(TeacherStatus::Active);
});

test('a teacher cannot be assigned a subject from another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherSubject = Subject::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('teachers.store'), [
        'name' => 'Mrs. Adebayo',
        'joined_at' => '2024-09-02',
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

test('adding a teacher requires a join date that is not in the future', function () {
    $schoolUser = SchoolUser::factory()->create();

    $this->actingAs($schoolUser, 'school')
        ->post(route('teachers.store'), ['name' => 'Mrs. Adebayo'])
        ->assertSessionHasErrors('joined_at');

    $this->actingAs($schoolUser, 'school')
        ->post(route('teachers.store'), ['name' => 'Mrs. Adebayo', 'joined_at' => now()->addDay()->toDateString()])
        ->assertSessionHasErrors('joined_at');
});

test('the teacher directory includes each teacher\'s join date', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    Teacher::factory()->for($school)->create(['joined_at' => '2022-05-09']);

    $response = $this->actingAs($schoolUser, 'school')->get(route('teachers.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('teachers.data.0.joined_at', '2022-05-09'));
});

test('a school user can update a teacher\'s status and subjects', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create();
    $subject = Subject::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->from(route('teachers.show', $teacher))->put(route('teachers.update', $teacher), [
        'name' => $teacher->name,
        'email' => $teacher->email,
        'phone' => $teacher->phone,
        'joined_at' => '2023-01-16',
        'subject_ids' => [$subject->id],
        'status' => TeacherStatus::OnLeave->value,
    ]);

    $response->assertRedirect(route('teachers.show', $teacher));
    expect($teacher->fresh()->status)->toBe(TeacherStatus::OnLeave);
    expect($teacher->fresh()->joined_at->toDateString())->toBe('2023-01-16');
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

test('teachers cannot be removed', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create();

    $this->actingAs($schoolUser, 'school')
        ->delete("/teachers/{$teacher->id}")
        ->assertStatus(405);

    expect(Teacher::withoutGlobalScopes()->find($teacher->id))->not->toBeNull();
});

test('a school user can deactivate and reactivate a teacher', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create();

    $this->actingAs($schoolUser, 'school')
        ->patch(route('teachers.status.update', $teacher), ['status' => TeacherStatus::Inactive->value])
        ->assertRedirect();
    expect($teacher->fresh()->status)->toBe(TeacherStatus::Inactive);

    $this->actingAs($schoolUser, 'school')
        ->patch(route('teachers.status.update', $teacher), ['status' => TeacherStatus::Active->value])
        ->assertRedirect();
    expect($teacher->fresh()->status)->toBe(TeacherStatus::Active);
});

test('a teacher status must be a valid status', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create();

    $this->actingAs($schoolUser, 'school')
        ->patch(route('teachers.status.update', $teacher), ['status' => 'retired'])
        ->assertSessionHasErrors('status');
});

test('a school user cannot change the status of another school\'s teacher', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherTeacher = Teacher::factory()->for(School::factory()->create())->create();

    $this->actingAs($schoolUser, 'school')
        ->patch(route('teachers.status.update', $otherTeacher), ['status' => TeacherStatus::Inactive->value])
        ->assertNotFound();

    expect($otherTeacher->fresh()->status)->toBe(TeacherStatus::Active);
});

test('teacher search returns only the school\'s active teachers, ignoring case', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    Teacher::factory()->for($school)->create(['name' => 'Mrs. Adebayo']);
    Teacher::factory()->for($school)->create(['name' => 'Mr. Adebayo Jr', 'status' => TeacherStatus::Inactive]);
    Teacher::factory()->for(School::factory()->create())->create(['name' => 'Adebayo Elsewhere']);

    $response = $this->actingAs($schoolUser, 'school')->getJson(route('teachers.search', ['q' => 'ADEBAYO']));

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Mrs. Adebayo');
});

test('guests cannot search teachers', function () {
    $this->getJson(route('teachers.search'))->assertUnauthorized();
});

test('the teacher form only offers active subjects', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    Subject::factory()->for($school)->create(['name' => 'Mathematics']);
    Subject::factory()->for($school)->inactive()->create(['name' => 'Latin']);

    $this->actingAs($schoolUser, 'school')->get(route('teachers.index'))->assertInertia(fn ($page) => $page
        ->has('subjects', 1)
        ->where('subjects.0.name', 'Mathematics'));
});
