<?php

namespace App\Http\Controllers;

use App\Enums\AttendanceStatus;
use App\Enums\StudentStatus;
use App\Exports\StudentsExport;
use App\Http\Requests\StoreStudentRequest;
use App\Http\Requests\UpdateStudentRequest;
use App\Http\Requests\UpdateStudentStatusRequest;
use App\Imports\StudentsImport;
use App\Models\AcademicTerm;
use App\Models\Attendance;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Guardian;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class StudentController extends Controller
{
    /**
     * Display the school's student directory.
     */
    public function index(Request $request): Response
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        $students = Student::query()
            ->with(['enrollments' => fn ($query) => $currentTerm
                ? $query->where('academic_session_id', $currentTerm->academic_session_id)->with('schoolClass:id,name')
                : $query->whereRaw('1 = 0')])
            ->withCount([
                'attendances as attendance_total',
                'attendances as attendance_present' => fn ($query) => $query->where('status', AttendanceStatus::Present),
            ])
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->trim()->toString();

                $query->where(fn ($query) => $query
                    ->whereLike('name', "%{$search}%")
                    ->orWhereLike('admission_number', "%{$search}%"));
            })
            ->when($request->string('status')->isNotEmpty(), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($currentTerm && $request->string('class_id')->isNotEmpty(), fn ($query) => $query->whereHas(
                'enrollments',
                fn ($query) => $query
                    ->where('academic_session_id', $currentTerm->academic_session_id)
                    ->where('school_class_id', $request->string('class_id')->toString())
            ))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Student $student) => [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'phone' => $student->phone,
                'admission_number' => $student->admission_number,
                'admission_date' => $student->admission_date?->toDateString(),
                'date_of_birth' => $student->date_of_birth?->toDateString(),
                'attendance_rate' => $student->attendance_total > 0
                    ? (int) round($student->attendance_present / $student->attendance_total * 100)
                    : null,
                'status' => $student->status->value,
                'class' => $student->enrollments->first()?->schoolClass
                    ? [
                        'id' => $student->enrollments->first()->schoolClass->id,
                        'name' => $student->enrollments->first()->schoolClass->name,
                    ]
                    : null,
            ]);

        return Inertia::render('school/students/index', [
            'students' => $students,
            'filters' => $request->only(['search', 'status', 'class_id']),
            'classes' => SchoolClass::query()->orderBy('name')->get(['id', 'name', 'status']),
            'current_term' => $currentTerm !== null,
            'stats' => [
                'total' => Student::query()->count(),
                'active' => Student::query()->where('status', StudentStatus::Active)->count(),
                'registered_this_month' => Student::query()->whereBetween('admission_date', [now()->startOfMonth(), now()->endOfMonth()])->count(),
                'transferred' => Student::query()->where('status', StudentStatus::Transferred)->count(),
            ],
        ]);
    }

    /**
     * Search the school's students by name or admission number, for pickers
     * that can't load the whole directory up front.
     */
    public function search(Request $request): JsonResponse
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();
        $search = $request->string('q')->trim()->toString();

        $students = Student::query()
            ->with(['enrollments' => fn ($query) => $currentTerm
                ? $query->where('academic_session_id', $currentTerm->academic_session_id)->with('schoolClass:id,name')
                : $query->whereRaw('1 = 0')])
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->whereLike('name', "%{$search}%")
                ->orWhereLike('admission_number', "%{$search}%")))
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'admission_number']);

        return response()->json([
            'data' => $students->map(fn (Student $student) => [
                'id' => $student->id,
                'name' => $student->name,
                'admission_number' => $student->admission_number,
                'class_name' => $student->enrollments->first()?->schoolClass?->name,
            ]),
        ]);
    }

    /**
     * Display a student's profile, enrollment history, guardians,
     * attendance history, and grades across all terms.
     */
    public function show(Student $student): Response
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        $enrollments = Enrollment::query()
            ->where('student_id', $student->id)
            ->with(['schoolClass:id,name', 'academicSession:id,name,start_date'])
            ->get()
            ->sortByDesc(fn (Enrollment $enrollment) => $enrollment->academicSession->start_date)
            ->map(fn (Enrollment $enrollment) => [
                'id' => $enrollment->id,
                'session' => [
                    'id' => $enrollment->academicSession->id,
                    'name' => $enrollment->academicSession->name,
                ],
                'class' => [
                    'id' => $enrollment->schoolClass->id,
                    'name' => $enrollment->schoolClass->name,
                ],
            ])
            ->values();

        $currentClass = $currentTerm
            ? $enrollments->firstWhere('session.id', $currentTerm->academic_session_id)['class'] ?? null
            : null;

        $guardians = $student->guardians()->get()->map(fn (Guardian $guardian) => [
            'id' => $guardian->id,
            'name' => $guardian->name,
            'email' => $guardian->email,
            'phone' => $guardian->phone,
            'relationship' => $guardian->pivot->relationship->value,
            'is_primary' => (bool) $guardian->pivot->is_primary,
        ]);

        $attendanceByTerm = Attendance::query()
            ->where('student_id', $student->id)
            ->with('academicTerm.academicSession:id,name')
            ->get()
            ->groupBy('academic_term_id')
            ->map(function ($records) {
                $term = $records->first()->academicTerm;

                return [
                    'term_id' => $term->id,
                    'term_name' => $term->name->value,
                    'session_name' => $term->academicSession->name,
                    'present' => $records->where('status', AttendanceStatus::Present)->count(),
                    'absent' => $records->where('status', AttendanceStatus::Absent)->count(),
                    'late' => $records->where('status', AttendanceStatus::Late)->count(),
                    'excused' => $records->where('status', AttendanceStatus::Excused)->count(),
                    'total' => $records->count(),
                ];
            })
            ->sortByDesc('term_id')
            ->values();

        $gradesByTerm = $this->gradesByTerm($student);
        $currentTermGrades = $currentTerm
            ? $gradesByTerm->firstWhere('term_id', $currentTerm->id)
            : null;

        return Inertia::render('school/students/show', [
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'phone' => $student->phone,
                'admission_number' => $student->admission_number,
                'admission_date' => $student->admission_date?->toDateString(),
                'date_of_birth' => $student->date_of_birth?->toDateString(),
                'status' => $student->status->value,
            ],
            'current_class' => $currentClass,
            'classes' => SchoolClass::query()->orderBy('name')->get(['id', 'name', 'status']),
            'enrollments' => $enrollments,
            'guardians' => $guardians,
            'attendance_by_term' => $attendanceByTerm,
            'current_term_grades' => $currentTermGrades,
        ]);
    }

    /**
     * Group a student's grades by academic term, most recent first.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function gradesByTerm(Student $student): Collection
    {
        return Grade::query()
            ->where('student_id', $student->id)
            ->with(['subject:id,name', 'academicTerm.academicSession:id,name'])
            ->get()
            ->groupBy('academic_term_id')
            ->map(function ($records) {
                $term = $records->first()->academicTerm;

                return [
                    'term_id' => $term->id,
                    'term_name' => $term->name->value,
                    'session_name' => $term->academicSession->name,
                    'subjects' => $records->map(fn (Grade $grade) => [
                        'subject' => $grade->subject->name,
                        'ca_score' => $grade->ca_score,
                        'exam_score' => $grade->exam_score,
                        'total' => $grade->total,
                        'grade' => $grade->grade->value,
                    ])->values(),
                    'average' => round((float) $records->avg('total'), 1),
                ];
            })
            ->sortByDesc('term_id')
            ->values();
    }

    /**
     * Display a student's full grade breakdown across all terms.
     */
    public function grades(Student $student): Response
    {
        return Inertia::render('school/students/grades', [
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
            ],
            'grades_by_term' => $this->gradesByTerm($student),
        ]);
    }

    /**
     * Display a student's full attendance history across all terms.
     */
    public function attendance(Student $student, Request $request): Response
    {
        $termId = $request->string('term_id')->toString();
        $classId = $request->string('class_id')->toString();
        $status = $request->string('status')->toString();
        $dateFrom = $request->date('date_from');
        $dateTo = $request->date('date_to');

        $records = Attendance::query()
            ->where('student_id', $student->id)
            ->with(['schoolClass:id,name', 'academicTerm.academicSession:id,name'])
            ->when($termId !== '', fn ($query) => $query->where('academic_term_id', $termId))
            ->when($classId !== '', fn ($query) => $query->where('school_class_id', $classId))
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->when($dateFrom, fn ($query) => $query->whereDate('date', '>=', $dateFrom))
            ->when($dateTo, fn ($query) => $query->whereDate('date', '<=', $dateTo))
            ->latest('date')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Attendance $attendance) => [
                'id' => $attendance->id,
                'date' => $attendance->date->toDateString(),
                'status' => $attendance->status->value,
                'class' => $attendance->schoolClass->name,
                'term_name' => $attendance->academicTerm->name->value,
                'session_name' => $attendance->academicTerm->academicSession->name,
            ]);

        return Inertia::render('school/students/attendance', [
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
            ],
            'records' => $records,
            'classes' => SchoolClass::query()->orderBy('name')->get(['id', 'name', 'status']),
            'terms' => AcademicTerm::query()
                ->with('academicSession:id,name')
                ->orderByDesc('start_date')
                ->get(['id', 'name', 'academic_session_id'])
                ->map(fn (AcademicTerm $term) => [
                    'id' => $term->id,
                    'name' => $term->name->value,
                    'session_name' => $term->academicSession->name,
                ]),
            'filters' => [
                'term_id' => $termId !== '' ? $termId : null,
                'class_id' => $classId !== '' ? $classId : null,
                'status' => $status !== '' ? $status : null,
                'date_from' => $dateFrom?->toDateString(),
                'date_to' => $dateTo?->toDateString(),
            ],
        ]);
    }

    /**
     * Add a student to the school, enrolling them in the given class for
     * the school's current academic session.
     */
    public function store(StoreStudentRequest $request): RedirectResponse
    {
        $student = Student::create($request->safe()->except([
            'class_id', 'guardian_name', 'guardian_email', 'guardian_phone', 'guardian_relationship',
        ]));

        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        $student->enrollments()->create([
            'school_class_id' => $request->validated('class_id'),
            'academic_session_id' => $currentTerm->academic_session_id,
        ]);

        if ($request->filled('guardian_name')) {
            $guardian = Guardian::create([
                'name' => $request->validated('guardian_name'),
                'email' => $request->validated('guardian_email'),
                'phone' => $request->validated('guardian_phone'),
            ]);

            $guardian->students()->attach($student->id, [
                'relationship' => $request->validated('guardian_relationship'),
                'is_primary' => true,
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Student added.')]);

        return to_route('students.index');
    }

    /**
     * Update a student's details, and their class enrollment for the
     * school's current academic session.
     */
    public function update(UpdateStudentRequest $request, Student $student): RedirectResponse
    {
        $student->update($request->safe()->except('class_id'));

        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        $student->enrollments()->updateOrCreate(
            ['academic_session_id' => $currentTerm->academic_session_id],
            ['school_class_id' => $request->validated('class_id')],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Student updated.')]);

        return back();
    }

    /**
     * Export the school's students as a CSV file.
     */
    public function export(): BinaryFileResponse
    {
        return Excel::download(new StudentsExport, 'students.csv', ExcelFormat::CSV);
    }

    /**
     * Import students from an uploaded CSV file.
     */
    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt'],
        ]);

        Excel::import(new StudentsImport, $request->file('file'));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Students imported.')]);

        return to_route('students.index');
    }

    /**
     * Change a student's status, e.g. to deactivate or reactivate it.
     */
    public function updateStatus(UpdateStudentStatusRequest $request, Student $student): RedirectResponse
    {
        $student->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Student status updated.')]);

        return back();
    }
}
