<?php

namespace App\Http\Controllers;

use App\Enums\RecordStatus;
use App\Enums\TeacherStatus;
use App\Http\Requests\StoreGradeRequest;
use App\Models\AcademicTerm;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GradeController extends Controller
{
    /**
     * Display the class roster for a given subject, ready to record grades.
     */
    public function index(Request $request): Response
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();
        $classId = $request->string('class_id')->toString();
        $subjectId = $request->string('subject_id')->toString();

        $roster = collect();

        if ($currentTerm && $classId !== '' && $subjectId !== '') {
            $existingByStudent = Grade::query()
                ->where('school_class_id', $classId)
                ->where('subject_id', $subjectId)
                ->where('academic_term_id', $currentTerm->id)
                ->get()
                ->keyBy('student_id');

            $roster = Enrollment::query()
                ->where('academic_session_id', $currentTerm->academic_session_id)
                ->where('school_class_id', $classId)
                ->with('student:id,name')
                ->get()
                ->map(function (Enrollment $enrollment) use ($existingByStudent) {
                    $existing = $existingByStudent->get($enrollment->student_id);

                    return [
                        'student_id' => $enrollment->student_id,
                        'name' => $enrollment->student->name,
                        'ca_score' => $existing?->ca_score ?? 0,
                        'exam_score' => $existing?->exam_score ?? 0,
                        'total' => $existing?->total ?? 0,
                        'grade' => $existing?->grade?->value,
                    ];
                })
                ->sortBy('name')
                ->values();
        }

        return Inertia::render('school/grades/index', [
            'classes' => SchoolClass::query()->where('status', RecordStatus::Active)->orderBy('name')->get(['id', 'name']),
            'subjects' => Subject::query()->where('status', RecordStatus::Active)->orderBy('name')->get(['id', 'name']),
            'teachers' => Teacher::query()->where('status', TeacherStatus::Active)->orderBy('name')->get(['id', 'name']),
            'current_term' => $currentTerm !== null,
            'filters' => [
                'class_id' => $classId !== '' ? $classId : null,
                'subject_id' => $subjectId !== '' ? $subjectId : null,
            ],
            'roster' => $roster,
            'stats' => [
                'total' => $roster->count(),
                'average' => $roster->count() > 0 ? round((float) $roster->avg('total'), 1) : 0,
                'passing' => $roster->where('grade', '!=', 'f')->count(),
            ],
        ]);
    }

    /**
     * Save a class's grades for a single subject in the current term.
     */
    public function store(StoreGradeRequest $request): RedirectResponse
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        foreach ($request->validated('records') as $record) {
            Grade::updateOrCreate(
                [
                    'student_id' => $record['student_id'],
                    'subject_id' => $request->validated('subject_id'),
                    'academic_term_id' => $currentTerm->id,
                ],
                [
                    'school_class_id' => $request->validated('class_id'),
                    'teacher_id' => $request->validated('teacher_id'),
                    'ca_score' => $record['ca_score'],
                    'exam_score' => $record['exam_score'],
                ],
            );
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Grades saved.')]);

        return to_route('grades.index', [
            'class_id' => $request->validated('class_id'),
            'subject_id' => $request->validated('subject_id'),
        ]);
    }
}
