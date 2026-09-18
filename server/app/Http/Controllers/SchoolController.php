<?php

namespace App\Http\Controllers;

use App\Enums\SchoolStatus;
use App\Http\Requests\StoreSchoolRequest;
use App\Models\School;
use App\Models\SchoolInvitation;
use App\Notifications\SchoolInvitationNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SchoolController extends Controller
{
    /**
     * Display the list of schools the ministry has invited.
     */
    public function index(Request $request): Response
    {
        $schools = School::query()
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->trim()->toString();

                $query->where(fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('contact_email', 'like', "%{$search}%"));
            })
            ->when($request->string('status')->isNotEmpty(), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (School $school) => [
                'id' => $school->id,
                'name' => $school->name,
                'contact_email' => $school->contact_email,
                'status' => $school->status->value,
                'invited_at' => $school->created_at?->toIso8601String(),
                'activated_at' => $school->activated_at?->toIso8601String(),
            ]);

        return Inertia::render('schools/index', [
            'schools' => $schools,
            'filters' => $request->only(['search', 'status']),
            'stats' => [
                'total' => School::query()->count(),
                'invited' => School::query()->where('status', SchoolStatus::Invited)->count(),
                'active' => School::query()->where('status', SchoolStatus::Active)->count(),
                'suspended' => School::query()->where('status', SchoolStatus::Suspended)->count(),
            ],
        ]);
    }

    /**
     * Display a school's profile, invitation status, and usage stats.
     */
    public function show(School $school): Response
    {
        $school->load('invitedBy:id,name,email');

        $latestInvitation = $school->invitations()->latest()->first();

        return Inertia::render('schools/show', [
            'school' => [
                'id' => $school->id,
                'name' => $school->name,
                'contact_email' => $school->contact_email,
                'status' => $school->status->value,
                'invited_at' => $school->created_at?->toIso8601String(),
                'activated_at' => $school->activated_at?->toIso8601String(),
                'invited_by' => $school->invitedBy ? [
                    'name' => $school->invitedBy->name,
                    'email' => $school->invitedBy->email,
                ] : null,
            ],
            'invitation' => $latestInvitation ? [
                'email' => $latestInvitation->email,
                'expires_at' => $latestInvitation->expires_at->toIso8601String(),
                'accepted_at' => $latestInvitation->accepted_at?->toIso8601String(),
                'is_expired' => $latestInvitation->isExpired(),
            ] : null,
            'stats' => [
                'teachers' => $school->teachers()->withoutGlobalScopes()->count(),
                'classes' => $school->classes()->withoutGlobalScopes()->count(),
                'students' => $school->students()->withoutGlobalScopes()->count(),
            ],
        ]);
    }

    /**
     * Suspend a school, blocking its accounts from logging in.
     */
    public function suspend(School $school): RedirectResponse
    {
        abort_if($school->status === SchoolStatus::Suspended, 403);

        $school->update(['status' => SchoolStatus::Suspended]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('School suspended.')]);

        return to_route('schools.show', $school);
    }

    /**
     * Reactivate a suspended school.
     */
    public function reactivate(School $school): RedirectResponse
    {
        abort_unless($school->status === SchoolStatus::Suspended, 403);

        $school->update(['status' => SchoolStatus::Active]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('School reactivated.')]);

        return to_route('schools.show', $school);
    }

    /**
     * Resend an invitation to a school that hasn't activated its account yet.
     */
    public function resendInvitation(School $school): RedirectResponse
    {
        abort_unless($school->status === SchoolStatus::Invited, 403);

        $invitation = SchoolInvitation::create([
            'school_id' => $school->id,
            'email' => $school->contact_email,
            'token' => Str::random(40),
            'expires_at' => now()->addDays(7),
        ]);

        Notification::route('mail', $school->contact_email)
            ->notify(new SchoolInvitationNotification($invitation));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Invitation resent to :name.', ['name' => $school->name]),
        ]);

        return to_route('schools.show', $school);
    }

    /**
     * Create a school and send it an invitation.
     */
    public function store(StoreSchoolRequest $request): RedirectResponse
    {
        $school = School::create([
            ...$request->validated(),
            'status' => SchoolStatus::Invited,
            'invited_by' => $request->user()->id,
        ]);

        $invitation = SchoolInvitation::create([
            'school_id' => $school->id,
            'email' => $school->contact_email,
            'token' => Str::random(40),
            'expires_at' => now()->addDays(7),
        ]);

        Notification::route('mail', $school->contact_email)
            ->notify(new SchoolInvitationNotification($invitation));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Invitation sent to :name.', ['name' => $school->name]),
        ]);

        return to_route('schools.index');
    }
}
