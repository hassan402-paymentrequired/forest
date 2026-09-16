<?php

use App\Enums\TeacherStatus;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\Teacher;

test('guests are redirected to the school login page', function () {
    $response = $this->get(route('teachers.index'));

    $response->assertRedirect(route('school.login'));
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

test('a school user can add a teacher, scoped to their own school automatically', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('teachers.store'), [
        'name' => 'Mrs. Adebayo',
        'email' => 'adebayo@example.com',
        'phone' => '08012345678',
        'subjects' => ['Mathematics', 'Physics'],
    ]);

    $response->assertRedirect(route('teachers.index'));

    $teacher = Teacher::withoutGlobalScopes()->sole();
    expect($teacher->school_id)->toBe($school->id);
    expect($teacher->name)->toBe('Mrs. Adebayo');
    expect($teacher->subjects)->toBe(['Mathematics', 'Physics']);
    expect($teacher->status)->toBe(TeacherStatus::Active);
});

test('adding a teacher requires a name', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('teachers.store'), [
        'name' => '',
    ]);

    $response->assertSessionHasErrors('name');
});

test('a school user can update a teacher\'s status', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('teachers.update', $teacher), [
        'name' => $teacher->name,
        'email' => $teacher->email,
        'phone' => $teacher->phone,
        'subjects' => $teacher->subjects,
        'status' => TeacherStatus::OnLeave->value,
    ]);

    $response->assertRedirect(route('teachers.index'));
    expect($teacher->fresh()->status)->toBe(TeacherStatus::OnLeave);
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

test('a school user can remove a teacher', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $teacher = Teacher::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->delete(route('teachers.destroy', $teacher));

    $response->assertRedirect(route('teachers.index'));
    expect(Teacher::withoutGlobalScopes()->find($teacher->id))->toBeNull();
});

test('a school user cannot remove a teacher belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherTeacher = Teacher::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->delete(route('teachers.destroy', $otherTeacher));

    $response->assertNotFound();
    expect(Teacher::withoutGlobalScopes()->find($otherTeacher->id))->not->toBeNull();
});
