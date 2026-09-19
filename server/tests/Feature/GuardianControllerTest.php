<?php

use App\Enums\GuardianRelationship;
use App\Enums\RecordStatus;
use App\Models\Enrollment;
use App\Models\Guardian;
use App\Models\School;
use App\Models\SchoolClass;
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

    $response = $this->actingAs($schoolUser, 'school')->from(route('guardians.show', $guardian))->put(route('guardians.update', $guardian), [
        'name' => 'Updated Name',
        'relationship' => GuardianRelationship::Guardian->value,
        'is_primary' => false,
        'student_ids' => [$newStudent->id],
    ]);

    $response->assertRedirect(route('guardians.show', $guardian));
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

test('the guardian directory lists each guardian\'s children with their admission number and current class', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    ['session' => $session] = setUpCurrentTerm($school);
    $class = SchoolClass::factory()->for($school)->create(['name' => 'JSS 1A']);
    $student = Student::factory()->for($school)->create(['name' => 'Ada Obi', 'admission_number' => 'ADM-001']);
    Enrollment::factory()->for($school)->create([
        'student_id' => $student->id,
        'school_class_id' => $class->id,
        'academic_session_id' => $session->id,
    ]);
    $guardian = Guardian::factory()->for($school)->create();
    $guardian->students()->attach($student, ['relationship' => GuardianRelationship::Mother, 'is_primary' => true]);

    $response = $this->actingAs($schoolUser, 'school')->get(route('guardians.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('has_students', true)
        ->where('guardians.data.0.relationship', 'mother')
        ->where('guardians.data.0.is_primary', true)
        ->where('guardians.data.0.students.0.name', 'Ada Obi')
        ->where('guardians.data.0.students.0.admission_number', 'ADM-001')
        ->where('guardians.data.0.students.0.class_name', 'JSS 1A')
        ->missing('students'));
});

test('the guardian directory does not send the whole student list to the page', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('guardians.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('has_students', false)
        ->missing('students'));
});

test('the guardian directory search ignores case and matches name, email, and phone', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    Guardian::factory()->for($school)->create(['name' => 'Jane Okafor', 'email' => 'jane@example.com', 'phone' => '0801']);
    Guardian::factory()->for($school)->create(['name' => 'Bola Ade', 'email' => 'bola@example.com', 'phone' => '0802']);

    foreach (['jane okafor', 'JANE@EXAMPLE', '0801'] as $search) {
        $this->actingAs($schoolUser, 'school')
            ->get(route('guardians.index', ['search' => $search]))
            ->assertInertia(fn ($page) => $page
                ->has('guardians.data', 1)
                ->where('guardians.data.0.name', 'Jane Okafor'));
    }
});

test('guardians cannot be removed', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $guardian = Guardian::factory()->for($school)->create();

    $this->actingAs($schoolUser, 'school')->delete("/guardians/{$guardian->id}")->assertStatus(405);

    expect(Guardian::withoutGlobalScopes()->find($guardian->id))->not->toBeNull();
});

test('a school user can deactivate and reactivate a guardian', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $guardian = Guardian::factory()->for($school)->create();

    $this->actingAs($schoolUser, 'school')
        ->patch(route('guardians.status.update', $guardian), ['status' => RecordStatus::Inactive->value])
        ->assertRedirect();
    expect($guardian->fresh()->status)->toBe(RecordStatus::Inactive);

    $this->actingAs($schoolUser, 'school')
        ->patch(route('guardians.status.update', $guardian), ['status' => RecordStatus::Active->value])
        ->assertRedirect();
    expect($guardian->fresh()->status)->toBe(RecordStatus::Active);
});

test('a guardian status must be valid', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $guardian = Guardian::factory()->for($school)->create();

    $this->actingAs($schoolUser, 'school')
        ->patch(route('guardians.status.update', $guardian), ['status' => 'deleted'])
        ->assertSessionHasErrors('status');
});

test('a school user cannot change the status of another school\'s guardian', function () {
    $schoolUser = SchoolUser::factory()->create();
    $other = Guardian::factory()->for(School::factory()->create())->create();

    $this->actingAs($schoolUser, 'school')
        ->patch(route('guardians.status.update', $other), ['status' => RecordStatus::Inactive->value])
        ->assertNotFound();

    expect($other->fresh()->status)->toBe(RecordStatus::Active);
});

test('the guardian directory can be filtered by status and counts active guardians', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    Guardian::factory()->for($school)->create(['name' => 'Jane Okafor']);
    Guardian::factory()->for($school)->inactive()->create(['name' => 'Bola Ade']);

    $this->actingAs($schoolUser, 'school')->get(route('guardians.index', ['status' => 'inactive']))->assertInertia(fn ($page) => $page
        ->has('guardians.data', 1)
        ->where('guardians.data.0.name', 'Bola Ade')
        ->where('guardians.data.0.status', 'inactive')
        ->where('stats.active', 1));
});
