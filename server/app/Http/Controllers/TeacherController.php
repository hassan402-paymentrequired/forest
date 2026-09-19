<?php

namespace App\Http\Controllers;

use App\Enums\GradeLetter;
use App\Enums\RecordStatus;
use App\Enums\TeacherStatus;
use App\Http\Requests\StoreTeacherRequest;
use App\Http\Requests\UpdateTeacherRequest;
use App\Http\Requests\UpdateTeacherStatusRequest;
use App\Models\AcademicTerm;
use App\Models\ClassTeacherAssignment;
use App\Models\Enrollment;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Inertia\Inertia;
use Inertia\Response;

class TeacherController extends Controller
{
    /**
     * Display the school's teacher directory.
     */
    public function index(Request $request): Response
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        $teachers = Teacher::query()
            ->with('subjects:id,name')
            ->with(['classAssignments' => fn ($query) => $currentTerm
                ? $query->where('academic_term_id', $currentTerm->id)->with('schoolClass:id,name')
                : $query->whereRaw('1 = 0')])
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->trim()->toString();

                $query->where(fn ($query) => $query
                    ->whereLike('name', "%{$search}%")
                    ->orWhereLike('email', "%{$search}%"));
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
                'joined_at' => $teacher->joined_at?->toDateString(),
                'subjects' => $teacher->subjects->map(fn (Subject $subject) => [
                    'id' => $subject->id,
                    'name' => $subject->name,
                ]),
                'classes' => $teacher->classAssignments->map(fn (ClassTeacherAssignment $assignment) => [
                    'id' => $assignment->schoolClass->id,
                    'name' => $assignment->schoolClass->name,
                ]),
                'status' => $teacher->status->value,
            ]);

        return Inertia::render('school/teachers/index', [
            'teachers' => $teachers,
            'filters' => $request->only(['search', 'status']),
            'subjects' => Subject::query()->where('status', RecordStatus::Active)->orderBy('name')->get(['id', 'name']),
            'stats' => [
                'total' => Teacher::query()->count(),
                'active' => Teacher::query()->where('status', TeacherStatus::Active)->count(),
                'on_leave' => Teacher::query()->where('status', TeacherStatus::OnLeave)->count(),
                'transferred' => Teacher::query()->where('status', TeacherStatus::Transferred)->count(),
            ],
        ]);
    }

    /**
     * Search the school's active teachers by name, for pickers that can't
     * load the whole directory up front.
     */
    public function search(Request $request): JsonResponse
    {
        $search = $request->string('q')->trim()->toString();

        $teachers = Teacher::query()
            ->where('status', TeacherStatus::Active)
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->whereLike('name', "%{$search}%")
                ->orWhereLike('email', "%{$search}%")))
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'email']);

        return response()->json(['data' => $teachers]);
    }

    /**
     * Display a teacher's profile, current class and students, class
     * assignments across terms, and a summary of the grades they've recorded.
     */
    public function show(Teacher $teacher): Response
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        $assignments = $teacher->classAssignments()
            ->with(['schoolClass:id,name', 'academicTerm.academicSession:id,name'])
            ->get();

        $currentAssignments = $assignments->filter(fn (ClassTeacherAssignment $assignment) => $assignment->academicTerm->is_current);

        $classAssignments = $assignments
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

        $studentsInCharge = $currentTerm && $currentAssignments->isNotEmpty()
            ? Enrollment::query()
                ->where('academic_session_id', $currentTerm->academic_session_id)
                ->whereIn('school_class_id', $currentAssignments->pluck('school_class_id'))
                ->with(['student:id,name,admission_number,status', 'schoolClass:id,name'])
                ->get()
                ->map(fn (Enrollment $enrollment) => [
                    'id' => $enrollment->student->id,
                    'name' => $enrollment->student->name,
                    'admission_number' => $enrollment->student->admission_number,
                    'class_name' => $enrollment->schoolClass->name,
                    'status' => $enrollment->student->status->value,
                ])
                ->sortBy([['class_name', 'asc'], ['name', 'asc']])
                ->values()
            : collect();

        $gradeRows = $teacher->grades()
            ->selectRaw('academic_term_id, subject_id, school_class_id, COUNT(*) as graded, SUM(total) as total_score, SUM(CASE WHEN grade = ? THEN 0 ELSE 1 END) as passing', [GradeLetter::F->value])
            ->groupBy('academic_term_id', 'subject_id', 'school_class_id')
            ->get();

        $subjectNames = Subject::query()->whereIn('id', $gradeRows->pluck('subject_id'))->pluck('name', 'id');
        $className = SchoolClass::query()->whereIn('id', $gradeRows->pluck('school_class_id'))->pluck('name', 'id');
        $terms = AcademicTerm::query()
            ->with('academicSession:id,name')
            ->whereIn('id', $gradeRows->pluck('academic_term_id'))
            ->get()
            ->keyBy('id');

        $gradesByTerm = $gradeRows
            ->groupBy('academic_term_id')
            ->map(function ($rows, $termId) use ($terms, $subjectNames, $className) {
                $term = $terms[$termId];
                $graded = (int) $rows->sum('graded');

                return [
                    'term_id' => $term->id,
                    'term_name' => $term->name->value,
                    'session_name' => $term->academicSession->name,
                    'is_current' => $term->is_current,
                    'starts_at' => $term->start_date->timestamp,
                    'entries' => $rows
                        ->map(fn ($row) => [
                            'subject' => $subjectNames[$row->subject_id],
                            'class' => $className[$row->school_class_id],
                            'students_graded' => (int) $row->graded,
                            'average' => round((float) $row->total_score / (int) $row->graded, 1),
                            'pass_rate' => round((int) $row->passing / (int) $row->graded * 100, 1),
                        ])
                        ->sortBy([['subject', 'asc'], ['class', 'asc']])
                        ->values(),
                    'average' => round((float) $rows->sum('total_score') / $graded, 1),
                ];
            })
            ->sortByDesc('starts_at')
            ->values()
            ->map(fn (array $term) => Arr::except($term, 'starts_at'));

        $totalGraded = (int) $gradeRows->sum('graded');

        return Inertia::render('school/teachers/show', [
            'teacher' => [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'phone' => $teacher->phone,
                'joined_at' => $teacher->joined_at?->toDateString(),
                'subjects' => $teacher->subjects()->get(['subjects.id', 'subjects.name']),
                'classes' => $currentAssignments->map(fn (ClassTeacherAssignment $assignment) => [
                    'id' => $assignment->schoolClass->id,
                    'name' => $assignment->schoolClass->name,
                ])->values(),
                'status' => $teacher->status->value,
            ],
            'subjects' => Subject::query()->where('status', RecordStatus::Active)->orderBy('name')->get(['id', 'name']),
            'class_assignments' => $classAssignments,
            'students' => $studentsInCharge,
            'grades_by_term' => $gradesByTerm,
            'stats' => [
                'subjects' => $teacher->subjects()->count(),
                'students' => $studentsInCharge->count(),
                'grades_recorded' => $totalGraded,
                'average' => $totalGraded > 0 ? round((float) $gradeRows->sum('total_score') / $totalGraded, 1) : null,
                'pass_rate' => $totalGraded > 0 ? round((int) $gradeRows->sum('passing') / $totalGraded * 100, 1) : null,
            ],
        ]);
    }

    /**
     * Add a teacher to the school.
     */
    public function store(StoreTeacherRequest $request): RedirectResponse
    {
        $teacher = Teacher::create($request->safe()->except('subject_ids'));

        $teacher->subjects()->sync($request->validated('subject_ids', []));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Teacher added.')]);

        return to_route('teachers.index');
    }

    /**
     * Update a teacher's details.
     */
    public function update(UpdateTeacherRequest $request, Teacher $teacher): RedirectResponse
    {
        $teacher->update($request->safe()->except('subject_ids'));

        $teacher->subjects()->sync($request->validated('subject_ids', []));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Teacher updated.')]);

        return back();
    }

    /**
     * Change a teacher's status, e.g. to deactivate or reactivate them.
     */
    public function updateStatus(UpdateTeacherStatusRequest $request, Teacher $teacher): RedirectResponse
    {
        $teacher->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Teacher status updated.')]);

        return back();
    }
}
