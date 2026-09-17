<?php

namespace App\Http\Controllers;

use App\Enums\TeacherStatus;
use App\Http\Requests\StoreTeacherRequest;
use App\Http\Requests\UpdateTeacherRequest;
use App\Models\ClassTeacherAssignment;
use App\Models\Grade;
use App\Models\Teacher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TeacherController extends Controller
{
    /**
     * Display the school's teacher directory.
     */
    public function index(Request $request): Response
    {
        $teachers = Teacher::query()
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->trim()->toString();

                $query->where(fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"));
            })
            ->when($request->string('status')->isNotEmpty(), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Teacher $teacher) => [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'phone' => $teacher->phone,
                'subjects' => $teacher->subjects ?? [],
                'status' => $teacher->status->value,
            ]);

        return Inertia::render('school/teachers/index', [
            'teachers' => $teachers,
            'filters' => $request->only(['search', 'status']),
            'stats' => [
                'total' => Teacher::query()->count(),
                'active' => Teacher::query()->where('status', TeacherStatus::Active)->count(),
                'on_leave' => Teacher::query()->where('status', TeacherStatus::OnLeave)->count(),
                'transferred' => Teacher::query()->where('status', TeacherStatus::Transferred)->count(),
            ],
        ]);
    }

    /**
     * Display a teacher's profile, class assignments across terms, and the
     * grades they've recorded.
     */
    public function show(Teacher $teacher): Response
    {
        $classAssignments = $teacher->classAssignments()
            ->with(['schoolClass:id,name', 'academicTerm.academicSession:id,name'])
            ->get()
            ->map(fn (ClassTeacherAssignment $assignment) => [
                'id' => $assignment->id,
                'class' => [
                    'id' => $assignment->schoolClass->id,
                    'name' => $assignment->schoolClass->name,
                ],
                'term_name' => $assignment->academicTerm->name->value,
                'session_name' => $assignment->academicTerm->academicSession->name,
                'is_current' => $assignment->academicTerm->is_current,
            ])
            ->sortByDesc('is_current')
            ->values();

        $gradesByTerm = $teacher->grades()
            ->with(['subject:id,name', 'schoolClass:id,name', 'academicTerm.academicSession:id,name'])
            ->get()
            ->groupBy('academic_term_id')
            ->map(function ($records) {
                $term = $records->first()->academicTerm;

                $entries = $records
                    ->groupBy(fn (Grade $grade) => "{$grade->subject_id}|{$grade->school_class_id}")
                    ->map(fn ($group) => [
                        'subject' => $group->first()->subject->name,
                        'class' => $group->first()->schoolClass->name,
                        'students_graded' => $group->count(),
                        'average' => round((float) $group->avg('total'), 1),
                    ])
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

        return Inertia::render('school/teachers/show', [
            'teacher' => [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'phone' => $teacher->phone,
                'subjects' => $teacher->subjects ?? [],
                'status' => $teacher->status->value,
            ],
            'class_assignments' => $classAssignments,
            'grades_by_term' => $gradesByTerm,
        ]);
    }

    /**
     * Add a teacher to the school.
     */
    public function store(StoreTeacherRequest $request): RedirectResponse
    {
        Teacher::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Teacher added.')]);

        return to_route('teachers.index');
    }

    /**
     * Update a teacher's details.
     */
    public function update(UpdateTeacherRequest $request, Teacher $teacher): RedirectResponse
    {
        $teacher->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Teacher updated.')]);

        return to_route('teachers.index');
    }

    /**
     * Remove a teacher from the school.
     */
    public function destroy(Teacher $teacher): RedirectResponse
    {
        $teacher->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Teacher removed.')]);

        return to_route('teachers.index');
    }
}
