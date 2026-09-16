<?php

use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;

test('guests are redirected to the school login page', function () {
    $response = $this->get(route('classes.index'));

    $response->assertRedirect(route('school.login'));
});

test('a school user only sees their own school\'s classes', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    SchoolClass::factory()->for($school)->count(2)->create();

    $otherSchool = School::factory()->create();
    SchoolClass::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('classes.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('classes.data', 2)
        ->where('stats.total', 2));
});

test('a school user can add a class, scoped to their own school automatically', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('classes.store'), [
        'name' => 'JSS 1A',
    ]);

    $response->assertRedirect(route('classes.index'));

    $class = SchoolClass::withoutGlobalScopes()->sole();
    expect($class->school_id)->toBe($school->id);
    expect($class->name)->toBe('JSS 1A');
});

test('adding a class requires a name', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('classes.store'), [
        'name' => '',
    ]);

    $response->assertSessionHasErrors('name');
});

test('a school user can update a class\'s name', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('classes.update', $class), [
        'name' => 'JSS 2B',
    ]);

    $response->assertRedirect(route('classes.index'));
    expect($class->fresh()->name)->toBe('JSS 2B');
});

test('a school user cannot update a class belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherClass = SchoolClass::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->put(route('classes.update', $otherClass), [
        'name' => 'Hijacked',
    ]);

    $response->assertNotFound();
    expect($otherClass->fresh()->name)->not->toBe('Hijacked');
});

test('a school user can remove a class', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $class = SchoolClass::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->delete(route('classes.destroy', $class));

    $response->assertRedirect(route('classes.index'));
    expect(SchoolClass::withoutGlobalScopes()->find($class->id))->toBeNull();
});

test('a school user cannot remove a class belonging to another school', function () {
    $schoolUser = SchoolUser::factory()->create();
    $otherSchool = School::factory()->create();
    $otherClass = SchoolClass::factory()->for($otherSchool)->create();

    $response = $this->actingAs($schoolUser, 'school')->delete(route('classes.destroy', $otherClass));

    $response->assertNotFound();
    expect(SchoolClass::withoutGlobalScopes()->find($otherClass->id))->not->toBeNull();
});
