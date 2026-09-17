<?php

use App\Enums\GuardianRelationship;
use App\Models\Guardian;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\Student;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

test('guests are redirected to the school login page', function () {
    $response = $this->get(route('guardians.index'));

    $response->assertRedirect(route('school.login'));
});

test('guests are redirected to the school login page when viewing a guardian', function () {
    $guardian = Guardian::factory()->create();

    $response = $this->get(route('guardians.show', $guardian));

    $response->assertRedirect(route('school.login'));
});

test('a school user can view a guardian\'s profile and linked students', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $guardian = Guardian::factory()->for($school)->create(['name' => 'Mrs. Bello']);
    $student = Student::factory()->for($school)->create(['name' => 'Ada Bello']);
    $guardian->students()->attach($student->id, [
        'relationship' => GuardianRelationship::Mother->value,
        'is_primary' => true,
    ]);

    $response = $this->actingAs($schoolUser, 'school')->get(route('guardians.show', $guardian));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('guardian.name', 'Mrs. Bello')
        ->has('students', 1)
        ->where('students.0.id', $student->id)
        ->where('students.0.relationship', 'mother')
        ->where('students.0.is_primary', true));
});

test('a guardian with no linked students shows an empty list', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $guardian = Guardian::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('guardians.show', $guardian));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->has('students', 0));
});

test('a school user cannot view another school\'s guardian', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherGuardian = Guardian::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('guardians.show', $otherGuardian));

    $response->assertNotFound();
});

test('a school user only sees their own school\'s guardians', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    Guardian::factory()->for($school)->count(2)->create();

    $otherSchool = School::factory()->create();
    Guardian::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('guardians.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('guardians.data', 2)
        ->where('stats.total', 2));
});

test('a school user can add a guardian linked to their own students', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('guardians.store'), [
        'name' => 'Jane Okafor',
        'email' => 'jane@example.com',
        'phone' => '08012345678',
        'relationship' => GuardianRelationship::Mother->value,
        'is_primary' => true,
        'student_ids' => [$student->id],
    ]);

    $response->assertRedirect(route('guardians.index'));

    $guardian = Guardian::withoutGlobalScopes()->sole();
    expect($guardian->school_id)->toBe($school->id);
    expect($guardian->name)->toBe('Jane Okafor');
    expect($guardian->students()->count())->toBe(1);

    $pivot = $guardian->students()->first()->pivot;
    expect($pivot->relationship)->toBe(GuardianRelationship::Mother);
    expect($pivot->is_primary)->toBeTrue();
});

test('adding a guardian requires a name, relationship, and at least one student', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('guardians.store'), [
        'name' => '',
        'relationship' => '',
        'student_ids' => [],
    ]);

    $response->assertSessionHasErrors(['name', 'relationship', 'student_ids']);
});

test('a school user cannot link a guardian to another school\'s student', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherStudent = Student::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('guardians.store'), [
        'name' => 'Jane Okafor',
        'relationship' => GuardianRelationship::Mother->value,
        'student_ids' => [$otherStudent->id],
    ]);

    $response->assertSessionHasErrors('student_ids.0');
});

test('marking a guardian primary for a student unmarks any other primary guardian for that student', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create();

    $firstGuardian = Guardian::factory()->for($school)->create();
    $firstGuardian->students()->attach($student->id, [
        'relationship' => GuardianRelationship::Father->value,
        'is_primary' => true,
    ]);

    $this->actingAs($schoolUser, 'school')->post(route('guardians.store'), [
        'name' => 'Jane Okafor',
        'relationship' => GuardianRelationship::Mother->value,
        'is_primary' => true,
        'student_ids' => [$student->id],
    ]);

    $firstPivot = DB::table('guardian_student')
        ->where('guardian_id', $firstGuardian->id)
        ->where('student_id', $student->id)
        ->first();

    expect((bool) $firstPivot->is_primary)->toBeFalse();
});

test('a school user can update a guardian\'s details and linked students', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $guardian = Guardian::factory()->for($school)->create();
    $originalStudent = Student::factory()->for($school)->create();
    $guardian->students()->attach($originalStudent->id, [
        'relationship' => GuardianRelationship::Father->value,
        'is_primary' => false,
    ]);
    $newStudent = Student::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('guardians.update', $guardian), [
        'name' => 'Updated Name',
        'relationship' => GuardianRelationship::Guardian->value,
        'is_primary' => false,
        'student_ids' => [$newStudent->id],
    ]);

    $response->assertRedirect(route('guardians.index'));
    expect($guardian->fresh()->name)->toBe('Updated Name');
    expect($guardian->students()->pluck('students.id')->all())->toBe([$newStudent->id]);
});

test('a school user cannot update a guardian belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherGuardian = Guardian::factory()->for($otherSchool)->create();
    $otherStudent = Student::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('guardians.update', $otherGuardian), [
        'name' => 'Hijacked',
        'relationship' => GuardianRelationship::Guardian->value,
        'student_ids' => [$otherStudent->id],
    ]);

    $response->assertNotFound();
    expect($otherGuardian->fresh()->name)->not->toBe('Hijacked');
});

test('a school user can remove a guardian', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $guardian = Guardian::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->delete(route('guardians.destroy', $guardian));

    $response->assertRedirect(route('guardians.index'));
    expect(Guardian::withoutGlobalScopes()->find($guardian->id))->toBeNull();
});

test('a school user cannot remove a guardian belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherGuardian = Guardian::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->delete(route('guardians.destroy', $otherGuardian));

    $response->assertNotFound();
    expect(Guardian::withoutGlobalScopes()->find($otherGuardian->id))->not->toBeNull();
});

test('a school user can export their guardians as a csv', function () {
    Excel::fake();

    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    Guardian::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('guardians.export'));

    $response->assertOk();
    Excel::assertDownloaded('guardians.csv');
});

test('a school user can import guardians from a csv', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $student = Student::factory()->for($school)->create(['name' => 'Ada Bello', 'admission_number' => 'ADM-3001']);

    $csv = "Name,Email,Phone,Relationship,Primary,Children\n"
        ."Jane Okafor,jane@example.com,08012345678,mother,yes,\"Ada Bello (ADM-3001)\"\n";

    $file = UploadedFile::fake()->createWithContent('guardians.csv', $csv);

    $response = $this->actingAs($schoolUser, 'school')->post(route('guardians.import'), [
        'file' => $file,
    ]);

    $response->assertRedirect(route('guardians.index'));

    $guardian = Guardian::withoutGlobalScopes()->where('school_id', $school->id)->sole();
    expect($guardian->name)->toBe('Jane Okafor');
    expect($guardian->students()->pluck('students.id')->all())->toBe([$student->id]);

    $pivot = $guardian->students()->first()->pivot;
    expect($pivot->relationship)->toBe(GuardianRelationship::Mother);
    expect($pivot->is_primary)->toBeTrue();
});

test('importing a csv skips rows whose children don\'t match an existing student', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();

    $csv = "Name,Email,Phone,Relationship,Primary,Children\n"
        ."Ghost Guardian,,,,,\"Unknown Kid (ADM-9999)\"\n";

    $file = UploadedFile::fake()->createWithContent('guardians.csv', $csv);

    $this->actingAs($schoolUser, 'school')->post(route('guardians.import'), [
        'file' => $file,
    ]);

    expect(Guardian::withoutGlobalScopes()->where('school_id', $school->id)->count())->toBe(0);
});
