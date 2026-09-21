<?php

namespace App\Actions\Ministry;

use App\Enums\GradeLetter;
use App\Enums\RecordStatus;
use App\Enums\StudentStatus;
use App\Enums\TeacherStatus;
use App\Models\School;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * One row of headline numbers per school, computed with a handful of grouped
 * queries. Every ministry analytics page is built from these rows (plus the
 * rollups below) so the numbers on the dashboard, drill-down, rankings,
 * watchlist and exports can never disagree.
 *
 * Queries go through the query builder rather than the models: the school
 * models are tenant-scoped to the signed-in school user, which would return
 * nothing for a ministry user.
 *
 * @phpstan-type SchoolRow array{
 *     id: string, name: string, code: string|null, status: string,
 *     type: string|null, level: string|null,
 *     lga: string|null, lga_label: string|null,
 *     education_district: string|null, district_label: string|null,
 *     has_current_term: bool,
 *     students_active: int, teachers_active: int, teachers_on_leave: int, classes_active: int, subjects_active: int,
 *     student_teacher_ratio: float|null,
 *     attendance_present: int, attendance_records: int, attendance_rate: float|null, last_attendance_date: string|null,
 *     grades_recorded: int, grades_passing: int, score_sum: float, average_score: float|null, pass_rate: float|null,
 *     students_without_guardian: int, classes_without_teacher: int|null, subjects_without_teacher: int, teachers_without_subjects: int
 * }
 */
class SchoolMetrics
{
    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function rows(SchoolFilter $filter): Collection
    {
        $schools = $filter->schools()->orderBy('name')->get();

        if ($schools->isEmpty()) {
            return collect();
        }

        $ids = $schools->pluck('id')->all();

        $termIds = DB::table('academic_terms')
            ->whereIn('school_id', $ids)
            ->where('is_current', true)
            ->pluck('id', 'school_id');

        $students = $this->countsByStatus('students', $ids);
        $teachers = $this->countsByStatus('teachers', $ids);
        $classes = $this->activeCounts('school_classes', $ids);
        $subjects = $this->activeCounts('subjects', $ids);
        $attendance = $this->attendanceByTerm($termIds);
        $grades = $this->gradesByTerm($termIds);
        $studentsWithoutGuardian = $this->studentsWithoutGuardian($ids);
        $classesWithoutTeacher = $this->classesWithoutTeacher($ids);
        $subjectsWithoutTeacher = $this->subjectsWithoutTeacher($ids);
        $teachersWithoutSubjects = $this->teachersWithoutSubjects($ids);

        return $schools->map(function (School $school) use (
            $termIds, $students, $teachers, $classes, $subjects, $attendance, $grades,
            $studentsWithoutGuardian, $classesWithoutTeacher, $subjectsWithoutTeacher, $teachersWithoutSubjects,
        ): array {
            $studentsActive = (int) ($students->get($school->id)?->get(StudentStatus::Active->value) ?? 0);
            $teachersActive = (int) ($teachers->get($school->id)?->get(TeacherStatus::Active->value) ?? 0);

            $present = (int) ($attendance->get($school->id)['present'] ?? 0);
            $records = (int) ($attendance->get($school->id)['records'] ?? 0);

            $gradeSummary = $grades->get($school->id);
            $gradesRecorded = (int) ($gradeSummary->recorded ?? 0);
            $gradesPassing = (int) ($gradeSummary->passing ?? 0);
            $scoreSum = $gradesRecorded > 0 ? (float) $gradeSummary->average * $gradesRecorded : 0.0;

            $hasCurrentTerm = $termIds->has($school->id);

            return [
                'id' => $school->id,
                'name' => $school->name,
                'code' => $school->code,
                'status' => $school->status->value,
                'type' => $school->type?->value,
                'level' => $school->level?->value,
                'lga' => $school->lga?->value,
                'lga_label' => $school->lga?->label(),
                'education_district' => $school->education_district?->value,
                'district_label' => $school->education_district?->label(),
                'has_current_term' => $hasCurrentTerm,
                'students_active' => $studentsActive,
                'teachers_active' => $teachersActive,
                'teachers_on_leave' => (int) ($teachers->get($school->id)?->get(TeacherStatus::OnLeave->value) ?? 0),
                'classes_active' => (int) ($classes->get($school->id) ?? 0),
                'subjects_active' => (int) ($subjects->get($school->id) ?? 0),
                'student_teacher_ratio' => $teachersActive > 0 ? round($studentsActive / $teachersActive, 1) : null,
                'attendance_present' => $present,
                'attendance_records' => $records,
                'attendance_rate' => self::percent($present, $records),
                'last_attendance_date' => $attendance->get($school->id)['last_date'] ?? null,
                'grades_recorded' => $gradesRecorded,
                'grades_passing' => $gradesPassing,
                'score_sum' => round($scoreSum, 2),
                'average_score' => $gradesRecorded > 0 ? round($scoreSum / $gradesRecorded, 1) : null,
                'pass_rate' => self::percent($gradesPassing, $gradesRecorded),
                'students_without_guardian' => (int) ($studentsWithoutGuardian->get($school->id) ?? 0),
                'classes_without_teacher' => $hasCurrentTerm ? (int) ($classesWithoutTeacher->get($school->id) ?? 0) : null,
                'subjects_without_teacher' => (int) ($subjectsWithoutTeacher->get($school->id) ?? 0),
                'teachers_without_subjects' => (int) ($teachersWithoutSubjects->get($school->id) ?? 0),
            ];
        });
    }

    /**
     * Combined headline numbers across a set of school rows. Rates are
     * weighted by their underlying counts, not averaged per school.
     *
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return array{schools: int, students: int, teachers: int, teachers_on_leave: int, classes: int, student_teacher_ratio: float|null, attendance_rate: float|null, grades_recorded: int, average_score: float|null, pass_rate: float|null}
     */
    public function totals(Collection $rows): array
    {
        $students = (int) $rows->sum('students_active');
        $teachers = (int) $rows->sum('teachers_active');
        $recorded = (int) $rows->sum('grades_recorded');

        return [
            'schools' => $rows->count(),
            'students' => $students,
            'teachers' => $teachers,
            'teachers_on_leave' => (int) $rows->sum('teachers_on_leave'),
            'classes' => (int) $rows->sum('classes_active'),
            'student_teacher_ratio' => $teachers > 0 ? round($students / $teachers, 1) : null,
            'attendance_rate' => self::percent((int) $rows->sum('attendance_present'), (int) $rows->sum('attendance_records')),
            'grades_recorded' => $recorded,
            'average_score' => $recorded > 0 ? round($rows->sum('score_sum') / $recorded, 1) : null,
            'pass_rate' => self::percent((int) $rows->sum('grades_passing'), $recorded),
        ];
    }

    /**
     * Totals for each value of a school attribute (e.g. `lga`), largest first.
     *
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    public function groupedTotals(Collection $rows, string $key, string $labelKey): Collection
    {
        return $rows
            ->filter(fn (array $row): bool => $row[$key] !== null)
            ->groupBy($key)
            ->map(fn (Collection $group, string $value): array => [
                'value' => $value,
                'label' => $group->first()[$labelKey],
                ...$this->totals($group->values()),
            ])
            ->sortByDesc('students')
            ->values();
    }

    public static function percent(int $part, int $whole): ?float
    {
        return $whole > 0 ? round($part / $whole * 100, 1) : null;
    }

    /**
     * @param  list<string>  $ids
     * @return Collection<string, Collection<string, int>>
     */
    private function countsByStatus(string $table, array $ids): Collection
    {
        return DB::table($table)
            ->whereIn('school_id', $ids)
            ->selectRaw('school_id, status, COUNT(*) as total')
            ->groupBy('school_id', 'status')
            ->get()
            ->groupBy('school_id')
            ->map(fn (Collection $rows): Collection => $rows->pluck('total', 'status')->map(fn ($total): int => (int) $total));
    }

    /**
     * @param  list<string>  $ids
     * @return Collection<string, int>
     */
    private function activeCounts(string $table, array $ids): Collection
    {
        return DB::table($table)
            ->whereIn('school_id', $ids)
            ->where('status', RecordStatus::Active->value)
            ->selectRaw('school_id, COUNT(*) as total')
            ->groupBy('school_id')
            ->pluck('total', 'school_id')
            ->map(fn ($total): int => (int) $total);
    }

    /**
     * @param  Collection<string, string>  $termIds  current term id keyed by school id
     * @return Collection<string, array{present: int, records: int, last_date: string|null}>
     */
    private function attendanceByTerm(Collection $termIds): Collection
    {
        if ($termIds->isEmpty()) {
            return collect();
        }

        return DB::table('attendances')
            ->whereIn('academic_term_id', $termIds->values())
            ->selectRaw('school_id, status, COUNT(*) as total, MAX(date) as last_date')
            ->groupBy('school_id', 'status')
            ->get()
            ->groupBy('school_id')
            ->map(fn (Collection $rows): array => [
                'present' => (int) $rows->firstWhere('status', 'present')?->total,
                'records' => (int) $rows->sum('total'),
                'last_date' => $rows->max('last_date') ? substr((string) $rows->max('last_date'), 0, 10) : null,
            ]);
    }

    /**
     * @param  Collection<string, string>  $termIds  current term id keyed by school id
     * @return Collection<string, object{recorded: int|string, average: float|string, passing: int|string}>
     */
    private function gradesByTerm(Collection $termIds): Collection
    {
        if ($termIds->isEmpty()) {
            return collect();
        }

        return DB::table('grades')
            ->whereIn('academic_term_id', $termIds->values())
            ->selectRaw('school_id, COUNT(*) as recorded, AVG(total) as average, SUM(CASE WHEN grade = ? THEN 0 ELSE 1 END) as passing', [GradeLetter::F->value])
            ->groupBy('school_id')
            ->get()
            ->keyBy('school_id');
    }

    /**
     * @param  list<string>  $ids
     * @return Collection<string, int>
     */
    private function studentsWithoutGuardian(array $ids): Collection
    {
        return DB::table('students')
            ->whereIn('school_id', $ids)
            ->where('status', StudentStatus::Active->value)
            ->whereNotExists(fn ($query) => $query
                ->select(DB::raw(1))
                ->from('guardian_student')
                ->whereColumn('guardian_student.student_id', 'students.id'))
            ->selectRaw('school_id, COUNT(*) as total')
            ->groupBy('school_id')
            ->pluck('total', 'school_id')
            ->map(fn ($total): int => (int) $total);
    }

    /**
     * Active classes with nobody in charge this term.
     *
     * @param  list<string>  $ids
     * @return Collection<string, int>
     */
    private function classesWithoutTeacher(array $ids): Collection
    {
        return DB::table('school_classes')
            ->whereIn('school_id', $ids)
            ->where('status', RecordStatus::Active->value)
            ->whereNotExists(fn ($query) => $query
                ->select(DB::raw(1))
                ->from('class_teacher_assignments as cta')
                ->join('academic_terms as t', 't.id', '=', 'cta.academic_term_id')
                ->whereColumn('cta.school_class_id', 'school_classes.id')
                ->where('t.is_current', true))
            ->selectRaw('school_id, COUNT(*) as total')
            ->groupBy('school_id')
            ->pluck('total', 'school_id')
            ->map(fn ($total): int => (int) $total);
    }

    /**
     * @param  list<string>  $ids
     * @return Collection<string, int>
     */
    private function subjectsWithoutTeacher(array $ids): Collection
    {
        return DB::table('subjects')
            ->whereIn('school_id', $ids)
            ->where('status', RecordStatus::Active->value)
            ->whereNotExists(fn ($query) => $query
                ->select(DB::raw(1))
                ->from('subject_teacher')
                ->whereColumn('subject_teacher.subject_id', 'subjects.id'))
            ->selectRaw('school_id, COUNT(*) as total')
            ->groupBy('school_id')
            ->pluck('total', 'school_id')
            ->map(fn ($total): int => (int) $total);
    }

    /**
     * @param  list<string>  $ids
     * @return Collection<string, int>
     */
    private function teachersWithoutSubjects(array $ids): Collection
    {
        return DB::table('teachers')
            ->whereIn('school_id', $ids)
            ->where('status', TeacherStatus::Active->value)
            ->whereNotExists(fn ($query) => $query
                ->select(DB::raw(1))
                ->from('subject_teacher')
                ->whereColumn('subject_teacher.teacher_id', 'teachers.id'))
            ->selectRaw('school_id, COUNT(*) as total')
            ->groupBy('school_id')
            ->pluck('total', 'school_id')
            ->map(fn ($total): int => (int) $total);
    }
}
