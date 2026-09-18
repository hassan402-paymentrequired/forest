<?php

use App\Enums\SchoolStatus;
use App\Models\MinistryUser;
use App\Models\School;
use App\Models\SchoolInvitation;
use App\Models\Student;
use App\Models\Teacher;
use App\Notifications\SchoolInvitationNotification;
use Illuminate\Support\Facades\Notification;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('schools.index'));

    $response->assertRedirect(route('login'));
});

test('guests are redirected to the login page when viewing a school', function () {
    $school = School::factory()->create();

    $response = $this->get(route('schools.show', $school));

    $response->assertRedirect(route('login'));
});

test('a ministry user can view a school\'s profile, invitation, and usage stats', function () {
    $ministryUser = MinistryUser::factory()->create();
    $school = School::factory()->for($ministryUser, 'invitedBy')->create();
    $invitation = SchoolInvitation::factory()->for($school)->create();
    Teacher::factory()->for($school)->count(2)->create();
    Student::factory()->for($school)->create();

    $response = $this->actingAs($ministryUser)->get(route('schools.show', $school));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('school.name', $school->name)
        ->where('school.invited_by.name', $ministryUser->name)
        ->where('invitation.email', $invitation->email)
        ->where('invitation.is_expired', false)
        ->where('stats.teachers', 2)
        ->where('stats.students', 1)
        ->where('stats.classes', 0));
});

test('a ministry user can suspend an active school', function () {
    $ministryUser = MinistryUser::factory()->create();
    $school = School::factory()->active()->create();

    $response = $this->actingAs($ministryUser)->post(route('schools.suspend', $school));

    $response->assertRedirect(route('schools.show', $school));
    expect($school->fresh()->status)->toBe(SchoolStatus::Suspended);
});

test('a school cannot be suspended twice', function () {
    $ministryUser = MinistryUser::factory()->create();
    $school = School::factory()->suspended()->create();

    $response = $this->actingAs($ministryUser)->post(route('schools.suspend', $school));

    $response->assertForbidden();
});

test('a ministry user can reactivate a suspended school', function () {
    $ministryUser = MinistryUser::factory()->create();
    $school = School::factory()->suspended()->create();

    $response = $this->actingAs($ministryUser)->post(route('schools.reactivate', $school));

    $response->assertRedirect(route('schools.show', $school));
    expect($school->fresh()->status)->toBe(SchoolStatus::Active);
});

test('a school that isn\'t suspended cannot be reactivated', function () {
    $ministryUser = MinistryUser::factory()->create();
    $school = School::factory()->active()->create();

    $response = $this->actingAs($ministryUser)->post(route('schools.reactivate', $school));

    $response->assertForbidden();
});

test('a ministry user can resend an invitation to a school that hasn\'t activated yet', function () {
    Notification::fake();

    $ministryUser = MinistryUser::factory()->create();
    $school = School::factory()->create();
    SchoolInvitation::factory()->for($school)->expired()->create();

    $response = $this->actingAs($ministryUser)->post(route('schools.resend-invitation', $school));

    $response->assertRedirect(route('schools.show', $school));
    expect(SchoolInvitation::where('school_id', $school->id)->count())->toBe(2);
    Notification::assertSentOnDemand(SchoolInvitationNotification::class);
});

test('an invitation cannot be resent to a school that has already activated', function () {
    $ministryUser = MinistryUser::factory()->create();
    $school = School::factory()->active()->create();

    $response = $this->actingAs($ministryUser)->post(route('schools.resend-invitation', $school));

    $response->assertForbidden();
});

test('a ministry user can view the list of schools', function () {
    $ministryUser = MinistryUser::factory()->create();
    School::factory()->count(2)->create();

    $response = $this->actingAs($ministryUser)->get(route('schools.index'));

    $response->assertOk();
});

test('the school directory shows when an active school was activated', function () {
    $ministryUser = MinistryUser::factory()->create();
    $school = School::factory()->active()->create();

    $response = $this->actingAs($ministryUser)->get(route('schools.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('schools.data.0.activated_at', $school->activated_at->toIso8601String()));
});

test('a ministry user can invite a school', function () {
    Notification::fake();

    $ministryUser = MinistryUser::factory()->create();

    $response = $this->actingAs($ministryUser)->post(route('schools.store'), [
        'name' => 'Lagos Model College',
        'contact_email' => 'admin@lagosmodel.edu.ng',
    ]);

    $response->assertRedirect(route('schools.index'));

    $school = School::sole();

    expect($school->name)->toBe('Lagos Model College');
    expect($school->contact_email)->toBe('admin@lagosmodel.edu.ng');
    expect($school->status)->toBe(SchoolStatus::Invited);
    expect($school->invited_by)->toBe($ministryUser->id);

    $invitation = SchoolInvitation::sole();

    expect($invitation->school_id)->toBe($school->id);
    expect($invitation->email)->toBe('admin@lagosmodel.edu.ng');
    expect($invitation->isAccepted())->toBeFalse();

    Notification::assertSentOnDemand(SchoolInvitationNotification::class);
});

test('inviting a school requires a name and a valid, unique contact email', function () {
    $ministryUser = MinistryUser::factory()->create();
    $existing = School::factory()->create();

    $response = $this->actingAs($ministryUser)->post(route('schools.store'), [
        'name' => '',
        'contact_email' => $existing->contact_email,
    ]);

    $response->assertSessionHasErrors(['name', 'contact_email']);
    expect(School::count())->toBe(1);
});
