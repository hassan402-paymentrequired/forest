<?php

namespace App\Enums;

use Illuminate\Support\Carbon;

/**
 * The reasons a school lands on the ministry watchlist. Adding a case (and
 * its branch in evaluate()) is all it takes to add a rule.
 */
enum WatchlistFlag: string
{
    case NoCurrentTerm = 'no_current_term';
    case LowAttendance = 'low_attendance';
    case HighStudentTeacherRatio = 'high_student_teacher_ratio';
    case StaleAttendance = 'stale_attendance';
    case LowPassRate = 'low_pass_rate';

    public function label(): string
    {
        return match ($this) {
            self::NoCurrentTerm => 'No current term',
            self::LowAttendance => 'Low attendance',
            self::HighStudentTeacherRatio => 'Understaffed',
            self::StaleAttendance => 'Attendance not recorded',
            self::LowPassRate => 'Low pass rate',
        };
    }

    /**
     * Why the flag applies to this school row, or null when it does not.
     *
     * @param  array<string, mixed>  $school  a row from SchoolMetrics::rows()
     */
    public function evaluate(array $school): ?string
    {
        $thresholds = config('ministry.thresholds');

        return match ($this) {
            self::NoCurrentTerm => $school['has_current_term']
                ? null
                : 'No current academic term is set',
            self::LowAttendance => $school['attendance_rate'] !== null && $school['attendance_rate'] < $thresholds['attendance_rate']
                ? "Attendance is {$school['attendance_rate']}% (below {$thresholds['attendance_rate']}%)"
                : null,
            self::HighStudentTeacherRatio => match (true) {
                $school['students_active'] > 0 && $school['teachers_active'] === 0 => "{$school['students_active']} students and no active teachers",
                $school['student_teacher_ratio'] !== null && $school['student_teacher_ratio'] > $thresholds['student_teacher_ratio'] => "{$school['student_teacher_ratio']} students per teacher (above {$thresholds['student_teacher_ratio']})",
                default => null,
            },
            self::StaleAttendance => self::attendanceIsStale($school, $thresholds['stale_days'])
                ? "No attendance recorded in the last {$thresholds['stale_days']} days"
                : null,
            self::LowPassRate => $school['pass_rate'] !== null && $school['pass_rate'] < $thresholds['pass_rate']
                ? "Pass rate is {$school['pass_rate']}% (below {$thresholds['pass_rate']}%)"
                : null,
        };
    }

    /**
     * @param  array<string, mixed>  $school
     */
    public static function attendanceIsStale(array $school, int $staleDays): bool
    {
        if (! $school['has_current_term'] || $school['students_active'] === 0) {
            return false;
        }

        if ($school['last_attendance_date'] === null) {
            return true;
        }

        return Carbon::parse($school['last_attendance_date'])->startOfDay()->diffInDays(today()) > $staleDays;
    }
}
