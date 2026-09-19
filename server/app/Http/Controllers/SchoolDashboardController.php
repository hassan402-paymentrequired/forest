<?php

namespace App\Http\Controllers;

use App\Enums\AttendanceStatus;
use App\Enums\GradeLetter;
use App\Enums\RecordStatus;
use App\Enums\StudentStatus;
use App\Enums\TeacherStatus;
use App\Models\AcademicTerm;
use App\Models\Attendance;
use App\Models\Grade;
use App\Models\Guardian;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class SchoolDashboardController extends Controller
{
    /**
     * Display the school's overview: headline counts, attendance, grade
     * performance and a few things that need attention.
     */
    public function __invoke(Request $request): Response
    {
        $currentTerm = AcademicTerm::query()->with('academicSession:id,name')->where('is_current', true)->first();

        return Inertia::render('school/dashboard', [
            'school_name' => $request->user('school')->school->name,
            'term' => $currentTerm ? [
                'name' => $currentTerm->name->value,
                'session_name' => $currentTerm->academicSession->name,
                'start_date' => $currentTerm->start_date->toDateString(),
                'end_date' => $currentTerm->end_date->toDateString(),
            ] : null,
            'stats' => [
                'students' => Student::query()->where('status', StudentStatus::Active)->count(),
                'teachers' => Teacher::query()->where('status', TeacherStatus::Active)->count(),
                'guardians' => Guardian::query()->where('status', RecordStatus::Active)->count(),
                'classes' => SchoolClass::query()->where('status', RecordStatus::Active)->count(),
            ],
            'attendance' => $this->attendance($currentTerm),
            'grades' => $this->grades($currentTerm),
            'class_performance' => $this->classPerformance($currentTerm),
            'teachers_on_leave' => Teacher::query()
                ->where('status', TeacherStatus::OnLeave)
                ->orderBy('name')
                ->limit(5)
                ->get(['id', 'name']),
            'recent_students' => Student::query()
                ->latest()
                ->limit(5)
                ->get(['id', 'name', 'admission_number', 'created_at'])
                ->map(fn (Student $student) => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'admission_number' => $student->admission_number,
                    'added_at' => $student->created_at->toDateString(),
                ]),
        ]);
    }

    /**
     * Today's and this term's attendance rates, plus the last week of
     * recorded days.
     *
     * @return array{today: float|null, term: float|null, trend: Collection<int, array{date: string, rate: float}>}
     */
    private function attendance(?AcademicTerm $currentTerm): array
    {
        $rate = fn (Collection $counts): ?float => $counts->sum() > 0
            ? round((int) $counts->get(AttendanceStatus::Present->value, 0) / $counts->sum() * 100, 1)
            : null;

        $today = Attendance::query()
            ->whereDate('date', today())
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $term = $currentTerm
            ? Attendance::query()
                ->where('academic_term_id', $currentTerm->id)
                ->selectRaw('status, COUNT(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status')
            : collect();

        $trend = $currentTerm
            ? Attendance::query()
                ->where('academic_term_id', $currentTerm->id)
                ->selectRaw('date, status, COUNT(*) as total')
                ->groupBy('date', 'status')
                ->toBase()
                ->get()
                ->groupBy(fn (object $row) => Carbon::parse($row->date)->toDateString())
                ->sortKeysDesc()
                ->take(7)
                ->map(fn (Collection $rows, string $date) => [
                    'date' => $date,
                    'rate' => $rate($rows->pluck('total', 'status')->map(fn ($total) => (int) $total)),
                ])
                ->sortKeys()
                ->values()
            : collect();

        return [
            'today' => $rate($today),
            'term' => $rate($term),
            'trend' => $trend,
        ];
    }

    /**
     * The current term's average score and pass rate across all grades.
     *
     * @return array{recorded: int, average: float|null, pass_rate: float|null}
     */
    private function grades(?AcademicTerm $currentTerm): array
    {
        $summary = $currentTerm
            ? Grade::query()
                ->where('academic_term_id', $currentTerm->id)
                ->selectRaw('COUNT(*) as recorded, AVG(total) as average, SUM(CASE WHEN grade = ? THEN 0 ELSE 1 END) as passing', [GradeLetter::F->value])
                ->first()
            : null;

        $recorded = (int) ($summary?->recorded ?? 0);

        return [
            'recorded' => $recorded,
            'average' => $recorded > 0 ? round((float) $summary->average, 1) : null,
            'pass_rate' => $recorded > 0 ? round((int) $summary->passing / $recorded * 100, 1) : null,
        ];
    }

    /**
     * Each class's average score this term, best first.
     *
     * @return Collection<int, array{id: string, name: string, average: float}>
     */
    private function classPerformance(?AcademicTerm $currentTerm): Collection
    {
        if (! $currentTerm) {
            return collect();
        }

        $averages = Grade::query()
            ->where('academic_term_id', $currentTerm->id)
            ->selectRaw('school_class_id, AVG(total) as average')
            ->groupBy('school_class_id')
            ->get();

        $names = SchoolClass::query()->whereIn('id', $averages->pluck('school_class_id'))->pluck('name', 'id');

        return $averages
            ->map(fn (Grade $row) => [
                'id' => $row->school_class_id,
                'name' => $names[$row->school_class_id],
                'average' => round((float) $row->average, 1),
            ])
            ->sortByDesc('average')
            ->values();
    }
}
