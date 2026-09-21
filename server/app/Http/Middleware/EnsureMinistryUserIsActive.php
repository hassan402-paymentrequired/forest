<?php

namespace App\Http\Middleware;

use App\Models\MinistryUser;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Signs a ministry user out of a session that was open when their account
 * was deactivated, so deactivation takes effect immediately.
 */
class EnsureMinistryUserIsActive
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof MinistryUser && ! $user->isActive()) {
            Auth::guard('web')->logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return to_route('login')->withErrors([
                'email' => __('This account has been deactivated. Contact a ministry administrator.'),
            ]);
        }

        return $next($request);
    }
}
