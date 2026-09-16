<?php

use App\Enums\StudentStatus;
use App\Models\AcademicSession;
use App\Models\AcademicTerm;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\Student;
use Illuminate\Http\UploadedFile;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Create a current academic term for the given school, so student
 * store/update requests (which require one to exist) succeed.
 */
function currentTermFor(School $school): AcademicTerm
{
    $session = AcademicSession::factory()->for($school)->create();

    return AcademicTerm::factory()->for($school)->for($session, 'academicSession')->current()->create();
}

test('guests are redirected to the school login page', function () {
    $response = $this->get(route('students.index'));

    $response->assertRedirect(route('school.login'));
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
    $term = currentTermFor($school);

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
    $term = currentTermFor($school);

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
    currentTermFor($school);

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
    $term = currentTermFor($school);

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
    currentTermFor($school);

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
