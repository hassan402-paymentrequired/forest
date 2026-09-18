<?php

namespace App\Http\Controllers;

use App\Enums\GradeLetter;
use App\Http\Requests\StoreSubjectRequest;
use App\Http\Requests\UpdateSubjectRequest;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SubjectController extends Controller
{
    /**
     * Display the school's subject directory.
     */
    public function index(Request $request): Response
    {
        $subjects = Subject::query()
            ->withCount('teachers')
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->trim()->toString();

                $query->where('name', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Subject $subject) => [
                'id' => $subject->id,
                'name' => $subject->name,
                'teachers_count' => $subject->teachers_count,
            ]);

        return Inertia::render('school/subjects/index', [
            'subjects' => $subjects,
            'filters' => $request->only(['search']),
            'stats' => [
                'total' => Subject::query()->count(),
            ],
        ]);
    }

    /**
     * Display a subject's qualified teachers and grade history by term.
     */
    public function show(Subject $subject): Response
    {
        $teachers = $subject->teachers()
            ->orderBy('name')
            ->get(['teachers.id', 'teachers.name', 'teachers.status'])
            ->map(fn (Teacher $teacher) => [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'status' => $teacher->status->value,
            ]);

        $gradesByTerm = $subject->grades()
            ->with(['schoolClass:id,name', 'academicTerm.academicSession:id,name'])
            ->get()
            ->groupBy('academic_term_id')
            ->map(function ($records) {
                $term = $records->first()->academicTerm;

                $entries = $records
                    ->groupBy('school_class_id')
                    ->map(fn ($group) => [
                        'class' => $group->first()->schoolClass->name,
                        'students_graded' => $group->count(),
                        'average' => round((float) $group->avg('total'), 1),
                        'passing' => $group->where('grade', '!=', GradeLetter::F)->count(),
                    ])
                    ->sortBy('class')
                    ->values();

                return [
                    'term_id' => $term->id,
                    'term_name' => $term->name->value,
                    'session_name' => $term->academicSession->name,
                    'entries' => $entries,
                ];
            })
            ->sortByDesc('term_id')
            ->values();

        return Inertia::render('school/subjects/show', [
            'subject' => [
                'id' => $subject->id,
                'name' => $subject->name,
            ],
            'teachers' => $teachers,
            'grades_by_term' => $gradesByTerm,
        ]);
    }

    /**
     * Add a subject to the school.
     */
    public function store(StoreSubjectRequest $request): RedirectResponse
    {
        Subject::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Subject added.')]);

        return to_route('subjects.index');
    }

    /**
     * Update a subject's details.
     */
    public function update(UpdateSubjectRequest $request, Subject $subject): RedirectResponse
    {
        $subject->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Subject updated.')]);

        return to_route('subjects.index');
    }

    /**
     * Remove a subject from the school.
     */
    public function destroy(Subject $subject): RedirectResponse
    {
        $subject->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Subject removed.')]);

        return to_route('subjects.index');
    }
}
