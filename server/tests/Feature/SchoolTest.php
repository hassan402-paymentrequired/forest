<?php

use App\Enums\SchoolStatus;
use App\Models\MinistryUser;
use App\Models\School;
use App\Models\SchoolInvitation;

test('a school belongs to the ministry user who invited it', function () {
    $ministryUser = MinistryUser::factory()->create();
    $school = School::factory()->for($ministryUser, 'invitedBy')->create();

    expect($school->invitedBy)->toBeInstanceOf(MinistryUser::class);
    expect($ministryUser->invitedSchools)->toHaveCount(1);
    expect($ministryUser->invitedSchools->first()->is($school))->toBeTrue();
});

test('a school defaults to invited status', function () {
    $school = School::factory()->create();

    expect($school->status)->toBe(SchoolStatus::Invited);
    expect($school->activated_at)->toBeNull();
});

test('a school has many invitations', function () {
    $school = School::factory()->create();
    SchoolInvitation::factory()->for($school)->count(2)->create();

    expect($school->invitations)->toHaveCount(2);
});

test('an invitation reports whether it is accepted or expired', function () {
    $accepted = SchoolInvitation::factory()->accepted()->create();
    $expired = SchoolInvitation::factory()->expired()->create();
    $pending = SchoolInvitation::factory()->create();

    expect($accepted->isAccepted())->toBeTrue();
    expect($accepted->isExpired())->toBeFalse();

    expect($expired->isAccepted())->toBeFalse();
    expect($expired->isExpired())->toBeTrue();

    expect($pending->isAccepted())->toBeFalse();
    expect($pending->isExpired())->toBeFalse();
});
