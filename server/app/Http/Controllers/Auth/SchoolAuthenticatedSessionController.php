<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\SchoolLoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SchoolAuthenticatedSessionController extends Controller
{
    /**
     * Show the school login page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/school-login');
    }

    /**
     * Authenticate a school account.
     */
    public function store(SchoolLoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        return to_route('school.dashboard');
    }

    /**
     * Log the school account out.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('school')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route('school.login');
    }
}
