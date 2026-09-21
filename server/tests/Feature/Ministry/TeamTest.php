<?php

use App\Enums\AuditAction;
use App\Enums\MinistryUserStatus;
use App\Models\MinistryAuditLog;
use App\Models\MinistryUser;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->ministryUser = MinistryUser::factory()->create(['name' => 'Chief Admin']);
});

test('guests are redirected to the login page', function () {
    $this->get(route('ministry.team.index'))->assertRedirect(route('login'));
});

test('the team page lists ministry staff and can search and filter by status', function () {
    MinistryUser::factory()->create(['name' => 'Ada Okafor']);
    MinistryUser::factory()->inactive()->create(['name' => 'Bola Ade']);

    $this->actingAs($this->ministryUser)->get(route('ministry.team.index'))->assertInertia(fn ($page) => $page
        ->component('ministry/team')
        ->has('members.data', 3)
        ->where('current_user_id', $this->ministryUser->id));

    $this->get(route('ministry.team.index', ['search' => 'okafor']))->assertInertia(fn ($page) => $page
        ->has('members.data', 1)
        ->where('members.data.0.name', 'Ada Okafor'));

    $this->get(route('ministry.team.index', ['status' => 'inactive']))->assertInertia(fn ($page) => $page
        ->has('members.data', 1)
        ->where('members.data.0.name', 'Bola Ade'));
});

describe('adding a team member', function () {
    test('it creates an active, verified account and emails a link to set a password', function () {
        Notification::fake();

        $this->actingAs($this->ministryUser)->post(route('ministry.team.store'), [
            'name' => 'New Officer',
            'email' => 'officer@education.gov.test',
        ])->assertRedirect(route('ministry.team.index'));

        $member = MinistryUser::query()->where('email', 'officer@education.gov.test')->firstOrFail();
        expect($member->status)->toBe(MinistryUserStatus::Active)
            ->and($member->email_verified_at)->not->toBeNull();

        Notification::assertSentTo($member, ResetPassword::class);
        expect(MinistryAuditLog::query()->where('action', AuditAction::TeamMemberInvited)->sole()->subject_id)->toBe($member->id);
    });

    test('nobody is given a password they were not sent', function () {
        Notification::fake();

        $this->actingAs($this->ministryUser)->post(route('ministry.team.store'), [
            'name' => 'New Officer',
            'email' => 'officer@education.gov.test',
        ]);

        $member = MinistryUser::query()->where('email', 'officer@education.gov.test')->firstOrFail();

        $this->post(route('logout'));
        $this->post(route('login'), ['email' => $member->email, 'password' => 'password'])->assertSessionHasErrors('email');
        $this->assertGuest();
    });

    test('it validates the name and a unique email', function () {
        $this->actingAs($this->ministryUser)->post(route('ministry.team.store'), [
            'name' => '',
            'email' => $this->ministryUser->email,
        ])->assertSessionHasErrors(['name', 'email']);

        expect(MinistryUser::query()->count())->toBe(1);
    });
});

describe('deactivating a team member', function () {
    test('a member can be deactivated and reactivated, and each is recorded', function () {
        $member = MinistryUser::factory()->create();

        $this->actingAs($this->ministryUser)->patch(route('ministry.team.status.update', $member), ['status' => 'inactive'])
            ->assertRedirect(route('ministry.team.index'));
        expect($member->fresh()->status)->toBe(MinistryUserStatus::Inactive);

        $this->patch(route('ministry.team.status.update', $member), ['status' => 'active']);
        expect($member->fresh()->status)->toBe(MinistryUserStatus::Active);

        expect(MinistryAuditLog::query()->get()->pluck('action')->map->value->sort()->values()->all())->toBe([
            AuditAction::TeamMemberDeactivated->value,
            AuditAction::TeamMemberReactivated->value,
        ]);
    });

    test('you cannot deactivate your own account', function () {
        $this->actingAs($this->ministryUser)->patch(route('ministry.team.status.update', $this->ministryUser), ['status' => 'inactive'])
            ->assertForbidden();

        expect($this->ministryUser->fresh()->status)->toBe(MinistryUserStatus::Active);
    });

    test('the status must be a real status', function () {
        $member = MinistryUser::factory()->create();

        $this->actingAs($this->ministryUser)->patch(route('ministry.team.status.update', $member), ['status' => 'deleted'])
            ->assertSessionHasErrors('status');
    });

    test('a deactivated member cannot sign in', function () {
        $member = MinistryUser::factory()->inactive()->create();

        $this->post(route('login'), ['email' => $member->email, 'password' => 'password'])->assertSessionHasErrors('email');

        $this->assertGuest();
    });

    test('an active member can still sign in', function () {
        $member = MinistryUser::factory()->create();

        $this->post(route('login'), ['email' => $member->email, 'password' => 'password']);

        $this->assertAuthenticatedAs($member);
    });

    test('a session that is open when the account is deactivated ends on the next request', function () {
        $member = MinistryUser::factory()->create();
        $this->actingAs($member)->get(route('dashboard'))->assertOk();

        $member->update(['status' => MinistryUserStatus::Inactive]);

        $this->get(route('dashboard'))->assertRedirect(route('login'));
        $this->assertGuest();
    });
});
