<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAcademicSessionRequest;
use App\Http\Requests\UpdateAcademicSessionRequest;
use App\Models\AcademicSession;
use App\Models\AcademicTerm;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AcademicSessionController extends Controller
{
    /**
     * Display the school's academic sessions and their terms.
     */
    public function index(Request $request): Response
    {
        $sessions = AcademicSession::query()
            ->with(['terms' => fn ($query) => $query->orderBy('start_date')])
            ->orderByDesc('start_date')
            ->get()
            ->map(fn (AcademicSession $session) => [
                'id' => $session->id,
                'name' => $session->name,
                'start_date' => $session->start_date->toDateString(),
                'end_date' => $session->end_date->toDateString(),
                'terms' => $session->terms->map(fn (AcademicTerm $term) => [
                    'id' => $term->id,
                    'name' => $term->name->value,
                    'start_date' => $term->start_date->toDateString(),
                    'end_date' => $term->end_date->toDateString(),
                    'is_current' => $term->is_current,
                ]),
            ]);

        $currentTerm = AcademicTerm::query()->with('academicSession')->where('is_current', true)->first();

        return Inertia::render('school/academic-terms/index', [
            'sessions' => $sessions,
            'stats' => [
                'total' => $sessions->count(),
                'current_term' => $currentTerm
                    ? "{$currentTerm->name->value} ({$currentTerm->academicSession->name})"
                    : null,
            ],
        ]);
    }

    /**
     * Add an academic session to the school.
     */
    public function store(StoreAcademicSessionRequest $request): RedirectResponse
    {
        AcademicSession::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Academic session added.')]);

        return to_route('academic-sessions.index');
    }

    /**
     * Update an academic session's details.
     */
    public function update(UpdateAcademicSessionRequest $request, AcademicSession $academicSession): RedirectResponse
    {
        $academicSession->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Academic session updated.')]);

        return to_route('academic-sessions.index');
    }

    /**
     * Remove an academic session from the school.
     */
    public function destroy(AcademicSession $academicSession): RedirectResponse
    {
        $academicSession->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Academic session removed.')]);

        return to_route('academic-sessions.index');
    }
}
