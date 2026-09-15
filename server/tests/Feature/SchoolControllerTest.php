<?php

use App\Enums\SchoolStatus;
use App\Models\MinistryUser;
use App\Models\School;
use App\Models\SchoolInvitation;
use App\Notifications\SchoolInvitationNotification;
use Illuminate\Support\Facades\Notification;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('schools.index'));

    $response->assertRedirect(route('login'));
});

test('a ministry user can view the list of schools', function () {
    $ministryUser = MinistryUser::factory()->create();
    School::factory()->count(2)->create();

    $response = $this->actingAs($ministryUser)->get(route('schools.index'));

    $response->assertOk();
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
