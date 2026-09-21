<?php

namespace App\Enums;

/**
 * Gaps in what a school has recorded, from the ministry's point of view: a
 * school with these issues can't be reported on reliably.
 */
enum DataQualityIssue: string
{
    case NoCurrentTerm = 'no_current_term';
    case NoRecentAttendance = 'no_recent_attendance';
    case NoGradesThisTerm = 'no_grades_this_term';
    case StudentsWithoutGuardian = 'students_without_guardian';
    case ClassesWithoutTeacher = 'classes_without_teacher';
    case SubjectsWithoutTeacher = 'subjects_without_teacher';
    case TeachersWithoutSubjects = 'teachers_without_subjects';

    public function label(): string
    {
        return match ($this) {
            self::NoCurrentTerm => 'No current term',
            self::NoRecentAttendance => 'No recent attendance',
            self::NoGradesThisTerm => 'No grades this term',
            self::StudentsWithoutGuardian => 'Students without a guardian',
            self::ClassesWithoutTeacher => 'Classes without a teacher',
            self::SubjectsWithoutTeacher => 'Subjects without a teacher',
            self::TeachersWithoutSubjects => 'Teachers without subjects',
        };
    }

    /**
     * The detail for this issue on the given school row, or null when the
     * school doesn't have it.
     *
     * @param  array<string, mixed>  $school  a row from SchoolMetrics::rows()
     */
    public function evaluate(array $school): ?string
    {
        return match ($this) {
            self::NoCurrentTerm => $school['has_current_term'] ? null : 'No current academic term is set',
            self::NoRecentAttendance => WatchlistFlag::attendanceIsStale($school, config('ministry.thresholds.stale_days'))
                ? 'No attendance recorded in the last '.config('ministry.thresholds.stale_days').' days'
                : null,
            self::NoGradesThisTerm => $school['has_current_term'] && $school['students_active'] > 0 && $school['grades_recorded'] === 0
                ? 'No grades recorded this term'
                : null,
            self::StudentsWithoutGuardian => $school['students_without_guardian'] > 0
                ? "{$school['students_without_guardian']} active students have no guardian"
                : null,
            self::ClassesWithoutTeacher => ($school['classes_without_teacher'] ?? 0) > 0
                ? "{$school['classes_without_teacher']} classes have no teacher this term"
                : null,
            self::SubjectsWithoutTeacher => $school['subjects_without_teacher'] > 0
                ? "{$school['subjects_without_teacher']} subjects have no teacher"
                : null,
            self::TeachersWithoutSubjects => $school['teachers_without_subjects'] > 0
                ? "{$school['teachers_without_subjects']} active teachers teach no subject"
                : null,
        };
    }
}
