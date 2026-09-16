<?php

use App\Enums\SchoolStatus;
use App\Models\School;
use App\Models\SchoolInvitation;
use App\Models\SchoolUser;

test('a valid invitation shows the accept-invitation page', function () {
    $invitation = SchoolInvitation::factory()->create();

    $response = $this->get(route('school-invitations.create', $invitation->token));

    $response->assertOk();
});

test('an already-accepted invitation redirects to the school login', function () {
    $invitation = SchoolInvitation::factory()->accepted()->create();

    $response = $this->get(route('school-invitations.create', $invitation->token));

    $response->assertRedirect(route('school.login'));
});

test('an expired invitation redirects to the school login', function () {
    $invitation = SchoolInvitation::factory()->expired()->create();

    $response = $this->get(route('school-invitations.create', $invitation->token));

    $response->assertRedirect(route('school.login'));
});

test('an unknown token 404s', function () {
    $response = $this->get(route('school-invitations.create', 'not-a-real-token'));

    $response->assertNotFound();
});

test('accepting an invitation creates a school user, activates the school, and logs in', function () {
    $school = School::factory()->create(['status' => SchoolStatus::Invited]);
    $invitation = SchoolInvitation::factory()->for($school)->create(['email' => 'admin@school.edu.ng']);

    $response = $this->post(route('school-invitations.store', $invitation->token), [
        'name' => 'Jane Admin',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect(route('school.dashboard'));

    $schoolUser = SchoolUser::sole();
    expect($schoolUser->name)->toBe('Jane Admin');
    expect($schoolUser->email)->toBe('admin@school.edu.ng');
    expect($schoolUser->school_id)->toBe($school->id);

    expect($invitation->fresh()->isAccepted())->toBeTrue();
    expect($school->fresh()->status)->toBe(SchoolStatus::Active);
    expect($school->fresh()->activated_at)->not->toBeNull();

    $this->assertAuthenticatedAs($schoolUser, 'school');
});

test('accepting an already-used invitation is rejected', function () {
    $invitation = SchoolInvitation::factory()->accepted()->create();

    $response = $this->post(route('school-invitations.store', $invitation->token), [
        'name' => 'Jane Admin',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect(route('school.login'));
    expect(SchoolUser::count())->toBe(0);
});

test('accepting an invitation requires a name and a confirmed password', function () {
    $invitation = SchoolInvitation::factory()->create();

    $response = $this->post(route('school-invitations.store', $invitation->token), [
        'name' => '',
        'password' => 'password123',
        'password_confirmation' => 'not-matching',
    ]);

    $response->assertSessionHasErrors(['name', 'password']);
});
