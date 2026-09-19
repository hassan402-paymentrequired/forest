<?php

namespace App\Http\Controllers;

use App\Enums\AttendanceStatus;
use App\Enums\RecordStatus;
use App\Http\Requests\StoreAttendanceRequest;
use App\Models\AcademicTerm;
use App\Models\Attendance;
use App\Models\Enrollment;
use App\Models\SchoolClass;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    /**
     * Display the class roster for a given date, ready to mark attendance.
     */
    public function index(Request $request): Response
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();
        $classId = $request->string('class_id')->toString();
        $date = $request->date('date') ?? today();

        $roster = collect();

        if ($currentTerm && $classId !== '') {
            $existingByStudent = Attendance::query()
                ->where('school_class_id', $classId)
                ->whereDate('date', $date)
                ->get()
                ->keyBy('student_id');

            $roster = Enrollment::query()
                ->where('academic_session_id', $currentTerm->academic_session_id)
                ->where('school_class_id', $classId)
                ->with('student:id,name')
                ->get()
                ->map(fn (Enrollment $enrollment) => [
                    'student_id' => $enrollment->student_id,
                    'name' => $enrollment->student->name,
                    'status' => $existingByStudent->get($enrollment->student_id)?->status->value ?? AttendanceStatus::Present->value,
                ])
                ->sortBy('name')
                ->values();
        }

        return Inertia::render('school/attendance/index', [
            'classes' => SchoolClass::query()->where('status', RecordStatus::Active)->orderBy('name')->get(['id', 'name']),
            'current_term' => $currentTerm !== null,
            'filters' => [
                'class_id' => $classId !== '' ? $classId : null,
                'date' => $date->toDateString(),
            ],
            'roster' => $roster,
            'stats' => [
                'total' => $roster->count(),
                'present' => $roster->where('status', AttendanceStatus::Present->value)->count(),
                'absent' => $roster->where('status', AttendanceStatus::Absent->value)->count(),
                'late' => $roster->where('status', AttendanceStatus::Late->value)->count(),
            ],
        ]);
    }

    /**
     * Save a class's attendance records for a single date.
     */
    public function store(StoreAttendanceRequest $request): RedirectResponse
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        foreach ($request->validated('records') as $record) {
            Attendance::updateOrCreate(
                [
                    'student_id' => $record['student_id'],
                    'date' => $request->validated('date'),
                ],
                [
                    'school_class_id' => $request->validated('class_id'),
                    'academic_term_id' => $currentTerm->id,
                    'status' => $record['status'],
                ],
            );
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Attendance saved.')]);

        return to_route('attendance.index', [
            'class_id' => $request->validated('class_id'),
            'date' => $request->validated('date'),
        ]);
    }
}
