<?php

namespace App\Http\Controllers;

use App\Enums\SchoolStatus;
use App\Http\Requests\AcceptSchoolInvitationRequest;
use App\Models\SchoolInvitation;
use App\Models\SchoolUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SchoolInvitationController extends Controller
{
    /**
     * Show the accept-invitation page for a school.
     */
    public function create(SchoolInvitation $invitation): Response|RedirectResponse
    {
        if ($reason = $this->invalidReason($invitation)) {
            return $this->redirectInvalid($reason);
        }

        return Inertia::render('auth/accept-school-invitation', [
            'token' => $invitation->token,
            'invitation' => [
                'email' => $invitation->email,
                'school_name' => $invitation->school->name,
            ],
        ]);
    }

    /**
     * Accept the invitation, creating the school's first account.
     */
    public function store(AcceptSchoolInvitationRequest $request, SchoolInvitation $invitation): RedirectResponse
    {
        if ($reason = $this->invalidReason($invitation)) {
            return $this->redirectInvalid($reason);
        }

        $schoolUser = SchoolUser::create([
            'school_id' => $invitation->school_id,
            'name' => $request->validated('name'),
            'email' => $invitation->email,
            'password' => $request->validated('password'),
        ]);

        $invitation->update(['accepted_at' => now()]);

        $invitation->school->update([
            'status' => SchoolStatus::Active,
            'activated_at' => now(),
        ]);

        Auth::guard('school')->login($schoolUser);

        return to_route('school.dashboard');
    }

    /**
     * Determine why the invitation can't be accepted, if at all.
     */
    private function invalidReason(SchoolInvitation $invitation): ?string
    {
        return match (true) {
            $invitation->isAccepted() => 'This invitation has already been accepted.',
            $invitation->isExpired() => 'This invitation has expired.',
            default => null,
        };
    }

    private function redirectInvalid(string $reason): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'error', 'message' => __($reason)]);

        return to_route('school.login');
    }
}
