<?php

use App\Enums\AnnouncementStatus;
use App\Enums\AuditAction;
use App\Models\Announcement;
use App\Models\MinistryAuditLog;
use App\Models\MinistryUser;
use App\Models\School;
use App\Models\SchoolUser;

beforeEach(function () {
    $this->ministryUser = MinistryUser::factory()->create();
});

describe('sending announcements', function () {
    test('guests are redirected to the login page', function () {
        $this->get(route('ministry.announcements.index'))->assertRedirect(route('login'));
        $this->post(route('ministry.announcements.store'))->assertRedirect(route('login'));
    });

    test('an announcement to all schools reaches active schools only', function () {
        $active = School::factory()->active()->count(2)->create();
        School::factory()->create();
        School::factory()->suspended()->create();

        $this->actingAs($this->ministryUser)->post(route('ministry.announcements.store'), [
            'title' => 'Term dates',
            'body' => 'Third term begins on 4 May.',
            'audience' => 'all',
        ])->assertRedirect(route('ministry.announcements.index'));

        $announcement = Announcement::query()->sole();
        expect($announcement->status)->toBe(AnnouncementStatus::Active)
            ->and($announcement->ministry_user_id)->toBe($this->ministryUser->id)
            ->and($announcement->schools()->pluck('schools.id')->sort()->values()->all())
            ->toBe($active->pluck('id')->sort()->values()->all());
    });

    test('an announcement can be sent to chosen schools only', function () {
        [$chosen, $skipped] = School::factory()->active()->count(2)->create();

        $this->actingAs($this->ministryUser)->post(route('ministry.announcements.store'), [
            'title' => 'Inspection',
            'body' => 'You have been selected for an inspection.',
            'audience' => 'selected',
            'school_ids' => [$chosen->id],
        ]);

        expect(Announcement::query()->sole()->schools()->pluck('schools.id')->all())->toBe([$chosen->id]);
        expect($skipped->announcements()->count())->toBe(0);
    });

    test('sending is recorded in the audit log with the recipient count', function () {
        School::factory()->active()->count(3)->create();

        $this->actingAs($this->ministryUser)->post(route('ministry.announcements.store'), [
            'title' => 'Hello', 'body' => 'World', 'audience' => 'all',
        ]);

        $log = MinistryAuditLog::query()->where('action', AuditAction::AnnouncementSent)->sole();
        expect($log->subject_label)->toBe('Hello')->and($log->metadata)->toBe(['recipients' => 3]);
    });

    test('it validates the fields and requires schools when the audience is selected', function () {
        $this->actingAs($this->ministryUser)->post(route('ministry.announcements.store'), [
            'title' => '', 'body' => '', 'audience' => 'everyone',
        ])->assertSessionHasErrors(['title', 'body', 'audience']);

        $this->post(route('ministry.announcements.store'), [
            'title' => 'T', 'body' => 'B', 'audience' => 'selected',
        ])->assertSessionHasErrors('school_ids');

        expect(Announcement::query()->count())->toBe(0);
    });

    test('a school that is not active cannot be chosen', function () {
        $invited = School::factory()->create();

        $this->actingAs($this->ministryUser)->post(route('ministry.announcements.store'), [
            'title' => 'T', 'body' => 'B', 'audience' => 'selected', 'school_ids' => [$invited->id],
        ])->assertSessionHasErrors('school_ids.0');
    });

    test('the page shows how many recipients have read each announcement', function () {
        $schools = School::factory()->active()->count(3)->create();
        $announcement = Announcement::factory()->create();
        $announcement->schools()->attach($schools->pluck('id'));
        $announcement->schools()->updateExistingPivot($schools->first()->id, ['read_at' => now()]);

        $this->actingAs($this->ministryUser)->get(route('ministry.announcements.index'))->assertInertia(fn ($page) => $page
            ->component('ministry/announcements')
            ->where('announcements.data.0.recipients', 3)
            ->where('announcements.data.0.read', 1)
            ->has('schools', 3));
    });

    test('an announcement can be archived once, and is never deleted', function () {
        $announcement = Announcement::factory()->create();

        $this->actingAs($this->ministryUser)->patch(route('ministry.announcements.archive', $announcement))
            ->assertRedirect(route('ministry.announcements.index'));

        expect($announcement->fresh()->status)->toBe(AnnouncementStatus::Archived);
        $this->patch(route('ministry.announcements.archive', $announcement))->assertForbidden();
        expect(MinistryAuditLog::query()->where('action', AuditAction::AnnouncementArchived)->count())->toBe(1);
    });
});

describe('the school inbox', function () {
    test('guests are redirected to the school login page', function () {
        $this->get(route('school.announcements.index'))->assertRedirect(route('school.login'));
    });

    test('a school sees only active announcements sent to it, unread first', function () {
        $school = School::factory()->active()->create();
        $schoolUser = SchoolUser::factory()->for($school)->create();

        $read = Announcement::factory()->create(['title' => 'Already read']);
        $unread = Announcement::factory()->create(['title' => 'Brand new']);
        $archived = Announcement::factory()->archived()->create(['title' => 'Archived']);
        $elsewhere = Announcement::factory()->create(['title' => 'For another school']);

        $school->announcements()->attach($read, ['read_at' => now()]);
        $school->announcements()->attach([$unread->id, $archived->id]);
        School::factory()->active()->create()->announcements()->attach($elsewhere);

        $this->actingAs($schoolUser, 'school')->get(route('school.announcements.index'))->assertInertia(fn ($page) => $page
            ->component('school/announcements/index')
            ->has('announcements.data', 2)
            ->where('announcements.data.0.title', 'Brand new')
            ->where('announcements.data.0.read_at', null)
            ->where('announcements.data.1.title', 'Already read'));
    });

    test('opening the inbox marks nothing read until the school asks', function () {
        $school = School::factory()->active()->create();
        $schoolUser = SchoolUser::factory()->for($school)->create();
        $announcement = Announcement::factory()->create();
        $school->announcements()->attach($announcement);

        $this->actingAs($schoolUser, 'school')->get(route('school.announcements.index'))
            ->assertInertia(fn ($page) => $page->where('unreadAnnouncements', 1));

        $this->post(route('school.announcements.read', $announcement))->assertRedirect();

        expect($school->announcements()->wherePivotNull('read_at')->count())->toBe(0);
        $this->get(route('school.announcements.index'))->assertInertia(fn ($page) => $page->where('unreadAnnouncements', 0));
    });

    test('a school cannot mark an announcement it was not sent as read', function () {
        $schoolUser = SchoolUser::factory()->for(School::factory()->active()->create())->create();
        $announcement = Announcement::factory()->create();

        $this->actingAs($schoolUser, 'school')->post(route('school.announcements.read', $announcement))->assertNotFound();
    });

    test('the unread count is zero for ministry pages', function () {
        $this->actingAs($this->ministryUser)->get(route('dashboard'))->assertInertia(fn ($page) => $page
            ->where('unreadAnnouncements', 0)
            ->where('portal', 'ministry'));
    });
});
