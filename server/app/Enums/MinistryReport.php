<?php

namespace App\Enums;

use App\Concerns\HasOptions;

/**
 * The CSV reports the ministry can download. Each maps its column headings to
 * keys on a school row (see SchoolMetrics::rows()).
 */
enum MinistryReport: string
{
    use HasOptions;

    case TermSummary = 'term-summary';
    case Enrolment = 'enrolment';
    case Staffing = 'staffing';
    case Attendance = 'attendance';
    case Performance = 'performance';
    case Watchlist = 'watchlist';
    case DataQuality = 'data-quality';

    public function label(): string
    {
        return match ($this) {
            self::TermSummary => 'Term summary',
            self::Enrolment => 'Enrolment',
            self::Staffing => 'Staffing',
            self::Attendance => 'Attendance',
            self::Performance => 'Academic performance',
            self::Watchlist => 'Watchlist',
            self::DataQuality => 'Data quality',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::TermSummary => 'Every school with its profile and headline numbers for the current term.',
            self::Enrolment => 'Active students and classes per school.',
            self::Staffing => 'Teachers, leave, student to teacher ratio and uncovered classes and subjects.',
            self::Attendance => 'Attendance records and rate this term, and when it was last recorded.',
            self::Performance => 'Grades recorded, average score and pass rate this term.',
            self::Watchlist => 'Schools at risk and the reasons they were flagged.',
            self::DataQuality => 'Schools with gaps in what they record.',
        };
    }

    /**
     * Column heading => key on the school row.
     *
     * @return array<string, string>
     */
    public function columns(): array
    {
        $school = ['School' => 'name', 'Code' => 'code', 'LGA' => 'lga_label', 'District' => 'district_label'];

        return match ($this) {
            self::TermSummary => [
                ...$school,
                'Type' => 'type',
                'Level' => 'level',
                'Status' => 'status',
                'Students' => 'students_active',
                'Teachers' => 'teachers_active',
                'Classes' => 'classes_active',
                'Attendance %' => 'attendance_rate',
                'Average score' => 'average_score',
                'Pass rate %' => 'pass_rate',
            ],
            self::Enrolment => [...$school, 'Students' => 'students_active', 'Classes' => 'classes_active'],
            self::Staffing => [
                ...$school,
                'Students' => 'students_active',
                'Teachers' => 'teachers_active',
                'Teachers on leave' => 'teachers_on_leave',
                'Students per teacher' => 'student_teacher_ratio',
                'Classes without a teacher' => 'classes_without_teacher',
                'Subjects without a teacher' => 'subjects_without_teacher',
            ],
            self::Attendance => [
                ...$school,
                'Records' => 'attendance_records',
                'Present' => 'attendance_present',
                'Attendance %' => 'attendance_rate',
                'Last recorded' => 'last_attendance_date',
            ],
            self::Performance => [
                ...$school,
                'Grades recorded' => 'grades_recorded',
                'Average score' => 'average_score',
                'Pass rate %' => 'pass_rate',
            ],
            self::Watchlist => [...$school, 'Reasons' => 'reasons'],
            self::DataQuality => [...$school, 'Issues' => 'issues_detail'],
        };
    }
}
