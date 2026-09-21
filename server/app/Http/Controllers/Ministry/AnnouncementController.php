<?php

namespace App\Http\Controllers\Ministry;

use App\Actions\Ministry\AuditLogger;
use App\Enums\AnnouncementStatus;
use App\Enums\AuditAction;
use App\Enums\SchoolStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAnnouncementRequest;
use App\Models\Announcement;
use App\Models\School;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementController extends Controller
{
    /**
     * Display the announcements the ministry has sent, and who has read them.
     */
    public function index(Request $request): Response
    {
        $announcements = Announcement::query()
            ->with('sender:id,name')
            ->withCount([
                'schools as recipients_count',
                'schools as read_count' => fn ($query) => $query->whereNotNull('announcement_school.read_at'),
            ])
            ->when($request->string('status')->isNotEmpty(), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Announcement $announcement): array => [
                'id' => $announcement->id,
                'title' => $announcement->title,
                'body' => $announcement->body,
                'status' => $announcement->status->value,
                'sender' => $announcement->sender?->name,
                'recipients' => (int) $announcement->recipients_count,
                'read' => (int) $announcement->read_count,
                'sent_at' => $announcement->created_at?->toIso8601String(),
            ]);

        return Inertia::render('ministry/announcements', [
            'announcements' => $announcements,
            'filters' => $request->only(['status']),
            'schools' => School::query()
                ->where('status', SchoolStatus::Active)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (School $school): array => ['id' => $school->id, 'name' => $school->name]),
        ]);
    }

    /**
     * Send an announcement to every active school, or to a chosen few.
     */
    public function store(StoreAnnouncementRequest $request, AuditLogger $audit): RedirectResponse
    {
        $announcement = Announcement::create([
            'ministry_user_id' => $request->user()->id,
            'title' => $request->validated('title'),
            'body' => $request->validated('body'),
            'status' => AnnouncementStatus::Active,
        ]);

        $recipientIds = $request->validated('audience') === 'all'
            ? School::query()->where('status', SchoolStatus::Active)->pluck('id')
            : collect($request->validated('school_ids'));

        $announcement->schools()->attach($recipientIds->all());

        $audit->record($request->user(), AuditAction::AnnouncementSent, $announcement, $announcement->title, [
            'recipients' => $recipientIds->count(),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Announcement sent to :count schools.', ['count' => $recipientIds->count()]),
        ]);

        return to_route('ministry.announcements.index');
    }

    /**
     * Archive an announcement so schools stop seeing it. Announcements are
     * never deleted.
     */
    public function archive(Request $request, Announcement $announcement, AuditLogger $audit): RedirectResponse
    {
        abort_unless($announcement->status === AnnouncementStatus::Active, 403);

        $announcement->update(['status' => AnnouncementStatus::Archived]);

        $audit->record($request->user(), AuditAction::AnnouncementArchived, $announcement, $announcement->title);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Announcement archived.')]);

        return to_route('ministry.announcements.index');
    }
}
