<?php

namespace App\Http\Controllers;

use App\Enums\AnnouncementStatus;
use App\Models\Announcement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SchoolAnnouncementController extends Controller
{
    /**
     * Display the ministry's announcements to this school, unread first.
     */
    public function index(Request $request): Response
    {
        $announcements = $request->user('school')->school->announcements()
            ->with('sender:id,name')
            ->where('announcements.status', AnnouncementStatus::Active)
            ->orderByRaw('announcement_school.read_at IS NOT NULL')
            ->latest('announcements.created_at')
            ->paginate(10)
            ->through(fn (Announcement $announcement): array => [
                'id' => $announcement->id,
                'title' => $announcement->title,
                'body' => $announcement->body,
                'sender' => $announcement->sender?->name,
                'sent_at' => $announcement->created_at?->toIso8601String(),
                'read_at' => $announcement->pivot->read_at,
            ]);

        return Inertia::render('school/announcements/index', [
            'announcements' => $announcements,
        ]);
    }

    /**
     * Mark an announcement as read for the school.
     */
    public function markRead(Request $request, Announcement $announcement): RedirectResponse
    {
        $school = $request->user('school')->school;

        abort_unless($school->announcements()->whereKey($announcement->id)->exists(), 404);

        $school->announcements()->updateExistingPivot($announcement->id, ['read_at' => now()]);

        return back();
    }
}
