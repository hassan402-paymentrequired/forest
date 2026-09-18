<?php

namespace App\Http\Controllers;

use App\Enums\AttendanceStatus;
use App\Enums\GradeLetter;
use App\Enums\TeacherStatus;
use App\Http\Requests\StoreSchoolClassRequest;
use App\Http\Requests\UpdateSchoolClassRequest;
use App\Models\AcademicTerm;
use App\Models\Attendance;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\SchoolClass;
use App\Models\Teacher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SchoolClassController extends Controller
{
    /**
     * Display the school's class directory.
     */
    public function index(Request $request): Response
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        $classes = SchoolClass::query()
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->trim()->toString();

                $query->where('name', 'like', "%{$search}%");
            })
            ->withCount(['enrollments as students_count' => fn ($query) => $currentTerm
                ? $query->where('academic_session_id', $currentTerm->academic_session_id)
                : $query->whereRaw('1 = 0')])
            ->with(['teacherAssignments' => fn ($query) => $currentTerm
                ? $query->where('academic_term_id', $currentTerm->id)->with('teacher:id,name')
                : $query->whereRaw('1 = 0')])
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (SchoolClass $class) => [
                'id' => $class->id,
                'name' => $class->name,
                'students_count' => $class->students_count,
                'teacher' => $class->teacherAssignments->first()?->teacher ? [
                    'id' => $class->teacherAssignments->first()->teacher->id,
                    'name' => $class->teacherAssignments->first()->teacher->name,
                ] : null,
            ]);

        return Inertia::render('school/classes/index', [
            'classes' => $classes,
            'filters' => $request->only(['search']),
            'stats' => [
                'total' => SchoolClass::query()->count(),
            ],
        ]);
    }

    /**
     * Display a class's roster, current-term class teacher, and attendance
     * summary for the school's current academic term.
     */
    public function show(SchoolClass $class): Response
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        $teacherAssignment = $currentTerm
            ? $class->teacherAssignments()
                ->where('academic_term_id', $currentTerm->id)
                ->with('teacher:id,name,email,phone')
                ->first()
            : null;

        $roster = collect();

        if ($currentTerm) {
            $attendanceByStudent = Attendance::query()
                ->where('school_class_id', $class->id)
                ->where('academic_term_id', $currentTerm->id)
                ->get()
                ->groupBy('student_id');

            $roster = Enrollment::query()
                ->where('school_class_id', $class->id)
                ->where('academic_session_id', $currentTerm->academic_session_id)
                ->with('student:id,name,admission_number,status')
                ->get()
                ->map(function (Enrollment $enrollment) use ($attendanceByStudent) {
                    $records = $attendanceByStudent->get($enrollment->student_id, collect());

                    return [
                        'id' => $enrollment->student->id,
                        'name' => $enrollment->student->name,
                        'admission_number' => $enrollment->student->admission_number,
                        'status' => $enrollment->student->status->value,
                        'attendance' => [
                            'present' => $records->where('status', AttendanceStatus::Present)->count(),
                            'absent' => $records->where('status', AttendanceStatus::Absent)->count(),
                            'late' => $records->where('status', AttendanceStatus::Late)->count(),
                            'excused' => $records->where('status', AttendanceStatus::Excused)->count(),
                            'days_recorded' => $records->count(),
                        ],
                    ];
                })
                ->sortBy('name')
                ->values();
        }

        $daysRecorded = $roster->sum('attendance.days_recorded');
        $daysPresent = $roster->sum('attendance.present');

        $gradeSummary = collect();
        $attendanceTrend = collect();

        if ($currentTerm) {
            $gradeSummary = Grade::query()
                ->where('school_class_id', $class->id)
                ->where('academic_term_id', $currentTerm->id)
                ->with('subject:id,name')
                ->get()
                ->groupBy('subject_id')
                ->map(fn ($records) => [
                    'subject' => $records->first()->subject->name,
                    'students_graded' => $records->count(),
                    'average' => round((float) $records->avg('total'), 1),
                    'passing' => $records->where('grade', '!=', GradeLetter::F)->count(),
                ])
                ->sortBy('subject')
                ->values();

            $attendanceTrend = Attendance::query()
                ->where('school_class_id', $class->id)
                ->where('academic_term_id', $currentTerm->id)
                ->get()
                ->groupBy(fn (Attendance $attendance) => $attendance->date->toDateString())
                ->sortKeysDesc()
                ->take(14)
                ->map(fn ($records, $date) => [
                    'date' => $date,
                    'present' => $records->where('status', AttendanceStatus::Present)->count(),
                    'absent' => $records->where('status', AttendanceStatus::Absent)->count(),
                    'late' => $records->where('status', AttendanceStatus::Late)->count(),
                    'excused' => $records->where('status', AttendanceStatus::Excused)->count(),
                    'total' => $records->count(),
                ])
                ->values();
        }

        return Inertia::render('school/classes/show', [
            'class' => [
                'id' => $class->id,
                'name' => $class->name,
            ],
            'current_term' => $currentTerm !== null,
            'teacher' => $teacherAssignment?->teacher ? [
                'id' => $teacherAssignment->teacher->id,
                'name' => $teacherAssignment->teacher->name,
                'email' => $teacherAssignment->teacher->email,
                'phone' => $teacherAssignment->teacher->phone,
            ] : null,
            'teachers' => Teacher::query()->where('status', TeacherStatus::Active)->orderBy('name')->get(['id', 'name']),
            'roster' => $roster,
            'grade_summary' => $gradeSummary,
            'attendance_trend' => $attendanceTrend,
            'stats' => [
                'total_students' => $roster->count(),
                'attendance_rate' => $daysRecorded > 0 ? round(($daysPresent / $daysRecorded) * 100, 1) : null,
            ],
        ]);
    }

    /**
     * Add a class to the school.
     */
    public function store(StoreSchoolClassRequest $request): RedirectResponse
    {
        SchoolClass::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Class added.')]);

        return to_route('classes.index');
    }

    /**
     * Update a class's details.
     */
    public function update(UpdateSchoolClassRequest $request, SchoolClass $class): RedirectResponse
    {
        $class->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Class updated.')]);

        return to_route('classes.index');
    }

    /**
     * Remove a class from the school.
     */
    public function destroy(SchoolClass $class): RedirectResponse
    {
        $class->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Class removed.')]);

        return to_route('classes.index');
    }
}
