<?php

namespace App\Actions\Ministry;

use App\Enums\GradeLetter;
use App\Enums\StudentStatus;
use App\Models\School;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Distributions and trends across the filtered schools that don't fit in a
 * per-school row: attendance over time, enrolment per session, the grade
 * spread, subject performance and subject coverage.
 */
class SystemBreakdowns
{
    /**
     * Weekly attendance rate across the schools for the last few weeks.
     *
     * @return Collection<int, array{week: string, rate: float}>
     */
    public function attendanceTrend(SchoolFilter $filter, int $weeks = 8): Collection
    {
        $since = today()->startOfWeek()->subWeeks($weeks - 1);

        return DB::table('attendances')
            ->whereIn('school_id', $this->schoolIds($filter))
            ->whereDate('date', '>=', $since)
            ->selectRaw('date, status, COUNT(*) as total')
            ->groupBy('date', 'status')
            ->get()
            ->groupBy(fn (object $row): string => Carbon::parse($row->date)->startOfWeek()->toDateString())
            ->map(fn (Collection $rows, string $week): array => [
                'week' => $week,
                'rate' => (float) SchoolMetrics::percent(
                    (int) $rows->where('status', 'present')->sum('total'),
                    (int) $rows->sum('total'),
                ),
            ])
            ->sortKeys()
            ->values();
    }

    /**
     * Attendance split across present, absent, late and excused this term.
     *
     * @return array<string, int>
     */
    public function attendanceBreakdown(SchoolFilter $filter): array
    {
        $counts = DB::table('attendances')
            ->join('academic_terms', 'academic_terms.id', '=', 'attendances.academic_term_id')
            ->where('academic_terms.is_current', true)
            ->whereIn('attendances.school_id', $this->schoolIds($filter))
            ->selectRaw('attendances.status as status, COUNT(*) as total')
            ->groupBy('attendances.status')
            ->pluck('total', 'status');

        return collect(['present', 'absent', 'late', 'excused'])
            ->mapWithKeys(fn (string $status): array => [$status => (int) ($counts[$status] ?? 0)])
            ->all();
    }

    /**
     * Students enrolled per academic session name.
     *
     * @return Collection<int, array{session: string, students: int}>
     */
    public function enrolmentBySession(SchoolFilter $filter): Collection
    {
        return DB::table('enrollments')
            ->join('academic_sessions', 'academic_sessions.id', '=', 'enrollments.academic_session_id')
            ->whereIn('enrollments.school_id', $this->schoolIds($filter))
            ->selectRaw('academic_sessions.name as session, COUNT(*) as students')
            ->groupBy('academic_sessions.name')
            ->orderBy('academic_sessions.name')
            ->get()
            ->map(fn (object $row): array => ['session' => $row->session, 'students' => (int) $row->students])
            ->values();
    }

    /**
     * Students enrolled in each of one school's classes this session.
     *
     * @return Collection<int, array{class: string, students: int}>
     */
    public function enrolmentByClass(School $school): Collection
    {
        return DB::table('enrollments')
            ->join('school_classes', 'school_classes.id', '=', 'enrollments.school_class_id')
            ->join('academic_terms', fn ($join) => $join
                ->on('academic_terms.academic_session_id', '=', 'enrollments.academic_session_id')
                ->where('academic_terms.is_current', true))
            ->where('enrollments.school_id', $school->id)
            ->selectRaw('school_classes.name as class, COUNT(*) as students')
            ->groupBy('school_classes.name')
            ->orderBy('school_classes.name')
            ->get()
            ->map(fn (object $row): array => ['class' => $row->class, 'students' => (int) $row->students])
            ->values();
    }

    /**
     * Students by status (active, graduated, transferred, withdrawn).
     *
     * @return array<string, int>
     */
    public function studentStatuses(SchoolFilter $filter): array
    {
        $counts = DB::table('students')
            ->whereIn('school_id', $this->schoolIds($filter))
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return collect(StudentStatus::cases())
            ->mapWithKeys(fn (StudentStatus $status): array => [$status->value => (int) ($counts[$status->value] ?? 0)])
            ->all();
    }

    /**
     * How many current-term grades fall on each letter.
     *
     * @return array<string, int>
     */
    public function gradeDistribution(SchoolFilter $filter): array
    {
        $counts = DB::table('grades')
            ->join('academic_terms', 'academic_terms.id', '=', 'grades.academic_term_id')
            ->where('academic_terms.is_current', true)
            ->whereIn('grades.school_id', $this->schoolIds($filter))
            ->selectRaw('grades.grade as grade, COUNT(*) as total')
            ->groupBy('grades.grade')
            ->pluck('total', 'grade');

        return collect(GradeLetter::cases())
            ->mapWithKeys(fn (GradeLetter $letter): array => [$letter->value => (int) ($counts[$letter->value] ?? 0)])
            ->all();
    }

    /**
     * Average score per subject across schools, this term. Subject names are
     * per school, so they are matched case-insensitively.
     *
     * @return Collection<int, array{subject: string, average: float, recorded: int, schools: int}>
     */
    public function subjectPerformance(SchoolFilter $filter): Collection
    {
        return DB::table('grades')
            ->join('academic_terms', 'academic_terms.id', '=', 'grades.academic_term_id')
            ->join('subjects', 'subjects.id', '=', 'grades.subject_id')
            ->where('academic_terms.is_current', true)
            ->whereIn('grades.school_id', $this->schoolIds($filter))
            ->selectRaw('LOWER(subjects.name) as subject, AVG(grades.total) as average, COUNT(*) as recorded, COUNT(DISTINCT grades.school_id) as schools')
            ->groupBy(DB::raw('LOWER(subjects.name)'))
            ->orderByDesc('average')
            ->get()
            ->map(fn (object $row): array => [
                'subject' => ucwords($row->subject),
                'average' => round((float) $row->average, 1),
                'recorded' => (int) $row->recorded,
                'schools' => (int) $row->schools,
            ])
            ->values();
    }

    /**
     * How many schools offer each subject, fewest first.
     *
     * @return Collection<int, array{subject: string, schools: int}>
     */
    public function subjectCoverage(SchoolFilter $filter): Collection
    {
        return DB::table('subjects')
            ->where('status', 'active')
            ->whereIn('school_id', $this->schoolIds($filter))
            ->selectRaw('LOWER(name) as subject, COUNT(DISTINCT school_id) as schools')
            ->groupBy(DB::raw('LOWER(name)'))
            ->orderBy('schools')
            ->orderBy('subject')
            ->get()
            ->map(fn (object $row): array => ['subject' => ucwords($row->subject), 'schools' => (int) $row->schools])
            ->values();
    }

    /**
     * @return Collection<int, string>
     */
    private function schoolIds(SchoolFilter $filter): Collection
    {
        return $filter->schools()->pluck('id');
    }
}
