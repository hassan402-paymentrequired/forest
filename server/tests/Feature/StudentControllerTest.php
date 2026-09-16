<?php

use App\Enums\StudentStatus;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\Student;
use Illuminate\Http\UploadedFile;
use Maatwebsite\Excel\Facades\Excel;

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
    expect($student->class_id)->toBe($class->id);
    expect($student->name)->toBe('Chidinma Okafor');
    expect($student->email)->toBe('chidinma@example.com');
    expect($student->phone)->toBe('08012345678');
    expect($student->status)->toBe(StudentStatus::Active);
});

test('adding a student requires a name and a class', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('students.store'), [
        'name' => '',
        'class_id' => '',
    ]);

    $response->assertSessionHasErrors(['name', 'class_id']);
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

    $response = $this->actingAs($schoolUser, 'school')->put(route('students.update', $student), [
        'name' => $student->name,
        'admission_number' => $student->admission_number,
        'class_id' => $newClass->id,
        'status' => StudentStatus::Graduated->value,
    ]);

    $response->assertRedirect(route('students.index'));
    expect($student->fresh()->status)->toBe(StudentStatus::Graduated);
    expect($student->fresh()->class_id)->toBe($newClass->id);
});

test('a school user cannot update a student belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherStudent = Student::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('students.update', $otherStudent), [
        'name' => 'Hijacked',
        'class_id' => $otherStudent->class_id,
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
    expect($student->class_id)->toBe($class->id);
    expect($student->status)->toBe(StudentStatus::Active);
});

test('importing a csv skips rows with an unrecognized class', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();

    $csv = "Name,Email,Phone,Admission Number,Admission Date,Class,Status\n"
        ."Ghost Student,,,,,Unknown Class,active\n";

    $file = UploadedFile::fake()->createWithContent('students.csv', $csv);

    $this->actingAs($schoolUser, 'school')->post(route('students.import'), [
        'file' => $file,
    ]);

    expect(Student::withoutGlobalScopes()->where('school_id', $school->id)->count())->toBe(0);
});
