<?php

namespace App\Http\Controllers;

use App\Enums\AttendanceStatus;
use App\Enums\StudentStatus;
use App\Exports\StudentsExport;
use App\Http\Requests\StoreStudentRequest;
use App\Http\Requests\UpdateStudentRequest;
use App\Imports\StudentsImport;
use App\Models\AcademicTerm;
use App\Models\Attendance;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Guardian;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->trim()->toString();

                $query->where(fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('admission_number', 'like', "%{$search}%"));
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
            'classes' => SchoolClass::query()->orderBy('name')->get(['id', 'name']),
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

        $gradesByTerm = Grade::query()
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

        return Inertia::render('school/students/show', [
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'phone' => $student->phone,
                'admission_number' => $student->admission_number,
                'admission_date' => $student->admission_date?->toDateString(),
                'status' => $student->status->value,
            ],
            'current_class' => $currentClass,
            'enrollments' => $enrollments,
            'guardians' => $guardians,
            'attendance_by_term' => $attendanceByTerm,
            'grades_by_term' => $gradesByTerm,
        ]);
    }

    /**
     * Add a student to the school, enrolling them in the given class for
     * the school's current academic session.
     */
    public function store(StoreStudentRequest $request): RedirectResponse
    {
        $student = Student::create($request->safe()->except('class_id'));

        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        $student->enrollments()->create([
            'school_class_id' => $request->validated('class_id'),
            'academic_session_id' => $currentTerm->academic_session_id,
        ]);

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

        return to_route('students.index');
    }

    /**
     * Remove a student from the school.
     */
    public function destroy(Student $student): RedirectResponse
    {
        $student->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Student removed.')]);

        return to_route('students.index');
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
}
