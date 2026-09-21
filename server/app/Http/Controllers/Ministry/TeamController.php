<?php

namespace App\Http\Controllers\Ministry;

use App\Actions\Ministry\AuditLogger;
use App\Enums\AuditAction;
use App\Enums\MinistryUserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMinistryUserRequest;
use App\Http\Requests\UpdateMinistryUserStatusRequest;
use App\Models\MinistryUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TeamController extends Controller
{
    /**
     * Display the ministry's staff accounts.
     */
    public function index(Request $request): Response
    {
        $members = MinistryUser::query()
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->trim()->toString();

                $query->where(fn ($query) => $query
                    ->whereLike('name', "%{$search}%")
                    ->orWhereLike('email', "%{$search}%"));
            })
            ->when($request->string('status')->isNotEmpty(), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (MinistryUser $member): array => [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'status' => $member->status->value,
                'two_factor_enabled' => $member->two_factor_confirmed_at !== null,
                'joined_at' => $member->created_at?->toIso8601String(),
            ]);

        return Inertia::render('ministry/team', [
            'members' => $members,
            'filters' => $request->only(['search', 'status']),
            'current_user_id' => $request->user()->id,
        ]);
    }

    /**
     * Add a ministry staff account. The person sets their own password from
     * the reset link they are emailed, so no password is ever shared.
     */
    public function store(StoreMinistryUserRequest $request, AuditLogger $audit): RedirectResponse
    {
        $member = MinistryUser::create([
            ...$request->validated(),
            'password' => Str::password(40),
            'status' => MinistryUserStatus::Active,
        ]);

        $member->forceFill(['email_verified_at' => now()])->save();

        Password::sendResetLink(['email' => $member->email]);

        $audit->record($request->user(), AuditAction::TeamMemberInvited, $member);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Invitation sent to :name.', ['name' => $member->name]),
        ]);

        return to_route('ministry.team.index');
    }

    /**
     * Deactivate or reactivate a staff account. Accounts are never deleted,
     * and you cannot deactivate your own.
     */
    public function updateStatus(UpdateMinistryUserStatusRequest $request, MinistryUser $ministryUser, AuditLogger $audit): RedirectResponse
    {
        $status = MinistryUserStatus::from($request->validated('status'));

        abort_if($status === MinistryUserStatus::Inactive && $ministryUser->is($request->user()), 403);

        $ministryUser->update(['status' => $status]);

        $audit->record(
            $request->user(),
            $status === MinistryUserStatus::Inactive ? AuditAction::TeamMemberDeactivated : AuditAction::TeamMemberReactivated,
            $ministryUser,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $status === MinistryUserStatus::Inactive
                ? __(':name deactivated.', ['name' => $ministryUser->name])
                : __(':name reactivated.', ['name' => $ministryUser->name]),
        ]);

        return to_route('ministry.team.index');
    }
}
