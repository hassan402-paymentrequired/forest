<?php

namespace App\Http\Controllers;

use App\Actions\Ministry\AuditLogger;
use App\Actions\Ministry\SchoolAlerts;
use App\Actions\Ministry\SchoolFilter;
use App\Actions\Ministry\SchoolMetrics;
use App\Actions\Ministry\SystemBreakdowns;
use App\Enums\AuditAction;
use App\Enums\EducationDistrict;
use App\Enums\Lga;
use App\Enums\SchoolStatus;
use App\Enums\SchoolType;
use App\Http\Requests\StoreSchoolRequest;
use App\Http\Requests\UpdateSchoolRequest;
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
                    ->whereLike('name', "%{$search}%")
                    ->orWhereLike('contact_email', "%{$search}%")
                    ->orWhereLike('code', "%{$search}%"));
            })
            ->when($request->string('status')->isNotEmpty(), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when(Lga::tryFrom($request->string('lga')->toString()), fn ($query, Lga $lga) => $query->where('lga', $lga))
            ->when(EducationDistrict::tryFrom($request->string('education_district')->toString()), fn ($query, EducationDistrict $district) => $query->where('education_district', $district))
            ->when(SchoolType::tryFrom($request->string('type')->toString()), fn ($query, SchoolType $type) => $query->where('type', $type))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (School $school) => [
                'id' => $school->id,
                'name' => $school->name,
                'code' => $school->code,
                'contact_email' => $school->contact_email,
                'status' => $school->status->value,
                'type' => $school->type?->value,
                'lga' => $school->lga?->label(),
                'education_district' => $school->education_district?->label(),
                'invited_at' => $school->created_at?->toIso8601String(),
                'activated_at' => $school->activated_at?->toIso8601String(),
            ]);

        return Inertia::render('schools/index', [
            'schools' => $schools,
            'filters' => $request->only(['search', 'status', 'lga', 'education_district', 'type']),
            'options' => SchoolFilter::options(),
            'stats' => [
                'total' => School::query()->count(),
                'invited' => School::query()->where('status', SchoolStatus::Invited)->count(),
                'active' => School::query()->where('status', SchoolStatus::Active)->count(),
                'suspended' => School::query()->where('status', SchoolStatus::Suspended)->count(),
            ],
        ]);
    }

    /**
     * Display a school's profile, invitation status, usage stats and, once
     * it is active, a read-only view of how it is doing.
     */
    public function show(School $school, SchoolMetrics $metrics, SystemBreakdowns $breakdowns, SchoolAlerts $alerts): Response
    {
        $school->load('invitedBy:id,name,email');

        $latestInvitation = $school->invitations()->latest()->first();

        $filter = SchoolFilter::forSchool($school);
        $rows = $metrics->rows($filter);

        return Inertia::render('schools/show', [
            'school' => [
                'id' => $school->id,
                'name' => $school->name,
                'code' => $school->code,
                'contact_email' => $school->contact_email,
                'status' => $school->status->value,
                'type' => $school->type?->value,
                'level' => $school->level?->value,
                'lga' => $school->lga?->value,
                'education_district' => $school->education_district?->value,
                'address' => $school->address,
                'invited_at' => $school->created_at?->toIso8601String(),
                'activated_at' => $school->activated_at?->toIso8601String(),
                'invited_by' => $school->invitedBy ? [
                    'name' => $school->invitedBy->name,
                    'email' => $school->invitedBy->email,
                ] : null,
            ],
            'options' => SchoolFilter::options(),
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
            'overview' => $rows->isEmpty() ? null : [
                'metrics' => $rows->first(),
                'flags' => $alerts->watchlist($rows)->first()['flags'] ?? [],
                'issues' => $alerts->dataQuality($rows)->first()['issues'] ?? [],
                'attendance_trend' => $breakdowns->attendanceTrend($filter),
                'attendance_breakdown' => $breakdowns->attendanceBreakdown($filter),
                'grade_distribution' => $breakdowns->gradeDistribution($filter),
                'subjects' => $breakdowns->subjectPerformance($filter),
                'enrolment_by_class' => $breakdowns->enrolmentByClass($school),
            ],
        ]);
    }

    /**
     * Update a school's profile: its code, type, level and location.
     */
    public function update(UpdateSchoolRequest $request, School $school, AuditLogger $audit): RedirectResponse
    {
        $school->update($request->validated());

        $audit->record($request->user(), AuditAction::SchoolUpdated, $school);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('School updated.')]);

        return to_route('schools.show', $school);
    }

    /**
     * Suspend a school, blocking its accounts from logging in.
     */
    public function suspend(Request $request, School $school, AuditLogger $audit): RedirectResponse
    {
        abort_if($school->status === SchoolStatus::Suspended, 403);

        $school->update(['status' => SchoolStatus::Suspended]);

        $audit->record($request->user(), AuditAction::SchoolSuspended, $school);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('School suspended.')]);

        return to_route('schools.show', $school);
    }

    /**
     * Reactivate a suspended school.
     */
    public function reactivate(Request $request, School $school, AuditLogger $audit): RedirectResponse
    {
        abort_unless($school->status === SchoolStatus::Suspended, 403);

        $school->update(['status' => SchoolStatus::Active]);

        $audit->record($request->user(), AuditAction::SchoolReactivated, $school);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('School reactivated.')]);

        return to_route('schools.show', $school);
    }

    /**
     * Resend an invitation to a school that hasn't activated its account yet.
     */
    public function resendInvitation(Request $request, School $school, AuditLogger $audit): RedirectResponse
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

        $audit->record($request->user(), AuditAction::InvitationResent, $school);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Invitation resent to :name.', ['name' => $school->name]),
        ]);

        return to_route('schools.show', $school);
    }

    /**
     * Create a school and send it an invitation.
     */
    public function store(StoreSchoolRequest $request, AuditLogger $audit): RedirectResponse
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

        $audit->record($request->user(), AuditAction::SchoolInvited, $school);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Invitation sent to :name.', ['name' => $school->name]),
        ]);

        return to_route('schools.index');
    }
}
