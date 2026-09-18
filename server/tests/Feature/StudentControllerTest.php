<?php

use App\Enums\AttendanceStatus;
use App\Enums\GuardianRelationship;
use App\Enums\StudentStatus;
use App\Models\Attendance;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Guardian;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\Student;
use App\Models\Subject;
use Illuminate\Http\UploadedFile;
use Maatwebsite\Excel\Facades\Excel;

test('guests are redirected to the school login page', function () {
    $response = $this->get(route('students.index'));

    $response->assertRedirect(route('school.login'));
});

test('guests are redirected to the school login page when viewing a student', function () {
    $student = Student::factory()->create();

    $response = $this->get(route('students.show', $student));

    $response->assertRedirect(route('school.login'));
});

test('a school user can view a student\'s profile, current class, guardians, attendance, and grades', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['session' => $session, 'term' => $term] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create(['name' => 'Chidinma Okafor']);
    Enrollment::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_session_id' => $session->id,
    ]);

    $guardian = Guardian::factory()->for($school)->create();
    $guardian->students()->attach($student->id, [
        'relationship' => GuardianRelationship::Mother->value,
        'is_primary' => true,
    ]);

    Attendance::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_term_id' => $term->id,
        'status' => AttendanceStatus::Present,
    ]);
    Attendance::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_term_id' => $term->id,
        'date' => today()->subDay(),
        'status' => AttendanceStatus::Absent,
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

    $response = $this->actingAs($schoolUser, 'school')->get(route('students.show', $student));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('student.name', 'Chidinma Okafor')
        ->where('current_class.id', $class->id)
        ->has('enrollments', 1)
        ->has('guardians', 1)
        ->where('guardians.0.id', $guardian->id)
        ->where('guardians.0.relationship', 'mother')
        ->where('guardians.0.is_primary', true)
        ->has('attendance_by_term', 1)
        ->where('attendance_by_term.0.present', 1)
        ->where('attendance_by_term.0.absent', 1)
        ->has('grades_by_term', 1)
        ->where('grades_by_term.0.subjects.0.subject', 'Mathematics')
        ->where('grades_by_term.0.subjects.0.total', 80));
});

test('a student with no enrollment, guardians, attendance, or grades shows an empty history', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('students.show', $student));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('current_class', null)
        ->has('enrollments', 0)
        ->has('guardians', 0)
        ->has('attendance_by_term', 0)
        ->has('grades_by_term', 0));
});

test('a school user cannot view another school\'s student', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherStudent = Student::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('students.show', $otherStudent));

    $response->assertNotFound();
});

test('a school user only sees their own school\'s students', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    Student::factory()->for($school)->count(2)->create();

    $otherSchool = School::factory()->create();
    Student::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('students.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('students.data', 2)
        ->where('stats.total', 2));
});

test('a school user can add a student to one of their own classes', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create();
    ['term' => $term] = setUpCurrentTerm($school);

    $response = $this->actingAs($schoolUser, 'school')->post(route('students.store'), [
        'name' => 'Chidinma Okafor',
        'email' => 'chidinma@example.com',
        'phone' => '08012345678',
        'admission_number' => 'ADM-1001',
        'class_id' => $class->id,
    ]);

    $response->assertRedirect(route('students.index'));

    $student = Student::withoutGlobalScopes()->sole();
    expect($student->school_id)->toBe($school->id);
    expect($student->name)->toBe('Chidinma Okafor');
    expect($student->email)->toBe('chidinma@example.com');
    expect($student->phone)->toBe('08012345678');
    expect($student->status)->toBe(StudentStatus::Active);

    $enrollment = Enrollment::withoutGlobalScopes()->sole();
    expect($enrollment->student_id)->toBe($student->id);
    expect($enrollment->school_class_id)->toBe($class->id);
    expect($enrollment->academic_session_id)->toBe($term->academic_session_id);
});

test('adding a student requires a name and a class', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('students.store'), [
        'name' => '',
        'class_id' => '',
    ]);

    $response->assertSessionHasErrors(['name', 'class_id']);
});

test('a student cannot be added when the school has no current academic term', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('students.store'), [
        'name' => 'Chidinma Okafor',
        'class_id' => $class->id,
    ]);

    $response->assertSessionHasErrors('class_id');
    expect(Student::withoutGlobalScopes()->count())->toBe(0);
});

test('a school user cannot assign a student to another school\'s class', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherClass = SchoolClass::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('students.store'), [
        'name' => 'Chidinma Okafor',
        'class_id' => $otherClass->id,
    ]);

    $response->assertSessionHasErrors('class_id');
});

test('a school user can update a student\'s status and class', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create();
    $newClass = SchoolClass::factory()->for($school)->create();
    ['term' => $term] = setUpCurrentTerm($school);

    $response = $this->actingAs($schoolUser, 'school')->put(route('students.update', $student), [
        'name' => $student->name,
        'admission_number' => $student->admission_number,
        'class_id' => $newClass->id,
        'status' => StudentStatus::Graduated->value,
    ]);

    $response->assertRedirect(route('students.index'));
    expect($student->fresh()->status)->toBe(StudentStatus::Graduated);

    $enrollment = Enrollment::withoutGlobalScopes()->where('student_id', $student->id)->sole();
    expect($enrollment->school_class_id)->toBe($newClass->id);
    expect($enrollment->academic_session_id)->toBe($term->academic_session_id);
});

test('updating a student\'s class again in the same session replaces their enrollment rather than duplicating it', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create();
    $firstClass = SchoolClass::factory()->for($school)->create();
    $secondClass = SchoolClass::factory()->for($school)->create();
    setUpCurrentTerm($school);

    $this->actingAs($schoolUser, 'school')->put(route('students.update', $student), [
        'name' => $student->name,
        'class_id' => $firstClass->id,
        'status' => StudentStatus::Active->value,
    ]);

    $this->actingAs($schoolUser, 'school')->put(route('students.update', $student), [
        'name' => $student->name,
        'class_id' => $secondClass->id,
        'status' => StudentStatus::Active->value,
    ]);

    $enrollments = Enrollment::withoutGlobalScopes()->where('student_id', $student->id)->get();
    expect($enrollments)->toHaveCount(1);
    expect($enrollments->first()->school_class_id)->toBe($secondClass->id);
});

test('a school user cannot update a student belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherStudent = Student::factory()->for($otherSchool)->create();
    $otherClass = SchoolClass::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('students.update', $otherStudent), [
        'name' => 'Hijacked',
        'class_id' => $otherClass->id,
        'status' => StudentStatus::Withdrawn->value,
    ]);

    $response->assertNotFound();
    expect($otherStudent->fresh()->name)->not->toBe('Hijacked');
});

test('a school user can remove a student', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->delete(route('students.destroy', $student));

    $response->assertRedirect(route('students.index'));
    expect(Student::withoutGlobalScopes()->find($student->id))->toBeNull();
});

test('a school user cannot remove a student belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherStudent = Student::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->delete(route('students.destroy', $otherStudent));

    $response->assertNotFound();
    expect(Student::withoutGlobalScopes()->find($otherStudent->id))->not->toBeNull();
});

test('a school user can export their students as a csv', function () {
    Excel::fake();

    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    Student::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('students.export'));

    $response->assertOk();
    Excel::assertDownloaded('students.csv');
});

test('a school user can import students from a csv', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create(['name' => 'JSS 1A']);
    ['term' => $term] = setUpCurrentTerm($school);

    $csv = "Name,Email,Phone,Admission Number,Admission Date,Class,Status\n"
        ."Chidinma Okafor,chidinma@example.com,08012345678,ADM-2001,2026-01-10,JSS 1A,active\n";

    $file = UploadedFile::fake()->createWithContent('students.csv', $csv);

    $response = $this->actingAs($schoolUser, 'school')->post(route('students.import'), [
        'file' => $file,
    ]);

    $response->assertRedirect(route('students.index'));

    $student = Student::withoutGlobalScopes()->where('school_id', $school->id)->sole();
    expect($student->name)->toBe('Chidinma Okafor');
    expect($student->email)->toBe('chidinma@example.com');
    expect($student->status)->toBe(StudentStatus::Active);

    $enrollment = Enrollment::withoutGlobalScopes()->where('student_id', $student->id)->sole();
    expect($enrollment->school_class_id)->toBe($class->id);
    expect($enrollment->academic_session_id)->toBe($term->academic_session_id);
});

test('importing a csv skips rows with an unrecognized class', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    setUpCurrentTerm($school);

    $csv = "Name,Email,Phone,Admission Number,Admission Date,Class,Status\n"
        ."Ghost Student,,,,,Unknown Class,active\n";

    $file = UploadedFile::fake()->createWithContent('students.csv', $csv);

    $this->actingAs($schoolUser, 'school')->post(route('students.import'), [
        'file' => $file,
    ]);

    expect(Student::withoutGlobalScopes()->where('school_id', $school->id)->count())->toBe(0);
});

test('importing a csv skips all rows when the school has no current academic term', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    SchoolClass::factory()->for($school)->create(['name' => 'JSS 1A']);

    $csv = "Name,Email,Phone,Admission Number,Admission Date,Class,Status\n"
        ."Chidinma Okafor,,,,,JSS 1A,active\n";

    $file = UploadedFile::fake()->createWithContent('students.csv', $csv);

    $this->actingAs($schoolUser, 'school')->post(route('students.import'), [
        'file' => $file,
    ]);

    expect(Student::withoutGlobalScopes()->where('school_id', $school->id)->count())->toBe(0);
});

test('the student directory shows each student\'s date of birth and attendance rate', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create(['date_of_birth' => '2012-05-10']);

    Attendance::factory()->for($school)->create([
        'student_id' => $student->id,
        'status' => AttendanceStatus::Present,
    ]);
    Attendance::factory()->for($school)->create([
        'student_id' => $student->id,
        'date' => today()->subDay(),
        'status' => AttendanceStatus::Absent,
    ]);

    $response = $this->actingAs($schoolUser, 'school')->get(route('students.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('students.data.0.date_of_birth', '2012-05-10')
        ->where('students.data.0.attendance_rate', 50));
});

test('a student with no attendance records has no attendance rate', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    Student::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('students.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('students.data.0.attendance_rate', null));
});

test('a school user can add a student with a guardian in the same request', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create();
    setUpCurrentTerm($school);

    $response = $this->actingAs($schoolUser, 'school')->post(route('students.store'), [
        'name' => 'Chidinma Okafor',
        'class_id' => $class->id,
        'guardian_name' => 'Jane Okafor',
        'guardian_email' => 'jane@example.com',
        'guardian_phone' => '08023456789',
        'guardian_relationship' => GuardianRelationship::Mother->value,
    ]);

    $response->assertRedirect(route('students.index'));

    $student = Student::withoutGlobalScopes()->sole();
    $guardian = Guardian::withoutGlobalScopes()->sole();
    expect($guardian->school_id)->toBe($school->id);
    expect($guardian->name)->toBe('Jane Okafor');
    expect($guardian->email)->toBe('jane@example.com');

    $pivot = $guardian->students()->withoutGlobalScopes()->sole();
    expect($pivot->id)->toBe($student->id);
    expect($pivot->pivot->relationship)->toBe(GuardianRelationship::Mother);
    expect($pivot->pivot->is_primary)->toBeTrue();
});

test('adding a student without guardian details does not create a guardian', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create();
    setUpCurrentTerm($school);

    $this->actingAs($schoolUser, 'school')->post(route('students.store'), [
        'name' => 'Chidinma Okafor',
        'class_id' => $class->id,
    ]);

    expect(Guardian::withoutGlobalScopes()->count())->toBe(0);
});

test('a guardian relationship is required when a guardian name is given', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create();
    setUpCurrentTerm($school);

    $response = $this->actingAs($schoolUser, 'school')->post(route('students.store'), [
        'name' => 'Chidinma Okafor',
        'class_id' => $class->id,
        'guardian_name' => 'Jane Okafor',
    ]);

    $response->assertSessionHasErrors('guardian_relationship');
    expect(Guardian::withoutGlobalScopes()->count())->toBe(0);
});

test('guests are redirected to the school login page when viewing a student\'s attendance', function () {
    $student = Student::factory()->create();

    $response = $this->get(route('students.attendance', $student));

    $response->assertRedirect(route('school.login'));
});

test('a school user cannot view another school\'s student attendance', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherStudent = Student::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('students.attendance', $otherStudent));

    $response->assertNotFound();
});

test('a school user can view a student\'s full attendance history', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create();
    ['term' => $term] = setUpCurrentTerm($school);

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

    $response = $this->actingAs($schoolUser, 'school')->get(route('students.attendance', $student));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('student.id', $student->id)
        ->has('records.data', 2)
        ->where('records.data.0.status', 'present')
        ->where('records.data.1.status', 'absent'));
});
