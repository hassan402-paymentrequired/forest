<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAcademicTermRequest;
use App\Http\Requests\UpdateAcademicTermRequest;
use App\Models\AcademicSession;
use App\Models\AcademicTerm;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AcademicTermController extends Controller
{
    /**
     * Add a term to an academic session.
     */
    public function store(StoreAcademicTermRequest $request, AcademicSession $academicSession): RedirectResponse
    {
        $academicSession->terms()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Term added.')]);

        return to_route('academic-sessions.index');
    }

    /**
     * Update a term's details.
     */
    public function update(UpdateAcademicTermRequest $request, AcademicTerm $academicTerm): RedirectResponse
    {
        $academicTerm->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Term updated.')]);

        return to_route('academic-sessions.index');
    }

    /**
     * Remove a term from its session.
     */
    public function destroy(AcademicTerm $academicTerm): RedirectResponse
    {
        $academicTerm->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Term removed.')]);

        return to_route('academic-sessions.index');
    }

    /**
     * Mark a term as the school's current term, unmarking any other current
     * term for that school (only one current term per school).
     */
    public function markCurrent(AcademicTerm $academicTerm): RedirectResponse
    {
        $academicTerm->update(['is_current' => true]);

        DB::table('academic_terms')
            ->where('school_id', $academicTerm->school_id)
            ->where('id', '!=', $academicTerm->id)
            ->update(['is_current' => false]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Current term updated.')]);

        return to_route('academic-sessions.index');
    }
}
