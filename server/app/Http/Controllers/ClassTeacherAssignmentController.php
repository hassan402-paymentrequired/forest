<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreClassTeacherAssignmentRequest;
use App\Models\AcademicTerm;
use App\Models\SchoolClass;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class ClassTeacherAssignmentController extends Controller
{
    /**
     * Assign (or change) the class teacher for a class in the school's
     * current academic term.
     */
    public function store(StoreClassTeacherAssignmentRequest $request, SchoolClass $class): RedirectResponse
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        $class->teacherAssignments()->updateOrCreate(
            ['academic_term_id' => $currentTerm->id],
            ['teacher_id' => $request->validated('teacher_id')],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Class teacher assigned.')]);

        return to_route('classes.show', $class);
    }

    /**
     * Remove the class teacher assignment for a class in the school's
     * current academic term.
     */
    public function destroy(SchoolClass $class): RedirectResponse
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        $class->teacherAssignments()->where('academic_term_id', $currentTerm?->id)->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Class teacher removed.')]);

        return to_route('classes.show', $class);
    }
}
