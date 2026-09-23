<?php

namespace App\Ai\Query;

use App\Enums\AttendanceStatus;
use App\Enums\GradeLetter;
use App\Enums\GuardianRelationship;
use App\Enums\SchoolLevel;
use App\Enums\SchoolStatus;
use App\Enums\SchoolType;
use App\Enums\StudentStatus;
use App\Enums\TeacherStatus;
use App\Enums\TermName;

/**
 * The curated, model-facing description of the tables the AI may query.
 * Only tables listed here are described to the model — sensitive tables
 * (logins, invitations, passkeys, sessions) are never mentioned, and the
 * read-only roles have no grants on them either.
 */
class SchemaCatalog
{
    /**
     * @return array<string, array{description: string, columns: array<string, string>}>
     */
    public function tables(): array
    {
        return [
            'student_directory' => [
                'description' => 'One row per student, with the class they are in this session. Use it for "students in a class", counting students, and looking a student up.',
                'columns' => [
                    'student_name' => 'Full name',
                    'admission_number' => 'School-issued admission number (nullable)',
                    'student_status' => 'One of: '.$this->values(StudentStatus::class),
                    'date_of_birth' => 'Date of birth (nullable)',
                    'admission_date' => 'Date admitted (nullable)',
                    'email' => 'Email (nullable)',
                    'phone' => 'Phone (nullable)',
                    'class_name' => 'Current class, e.g. "JSS 1A" (null if not enrolled this session)',
                ],
            ],
            'teacher_directory' => [
                'description' => 'One row per teacher. Use it for staff questions: who teaches a subject, who is on leave, who is in charge of a class.',
                'columns' => [
                    'teacher_name' => 'Full name',
                    'email' => 'Email (nullable)',
                    'phone' => 'Phone (nullable)',
                    'teacher_status' => 'One of: '.$this->values(TeacherStatus::class),
                    'subjects_taught' => 'Comma-separated subject names (nullable); match with ILIKE \'%mathematics%\'',
                    'classes_in_charge' => 'Comma-separated classes they are in charge of this term (nullable)',
                ],
            ],
            'grade_report' => [
                'description' => 'One row per student per subject per term. Use it for scores, results, best/worst performance and averages.',
                'columns' => [
                    'student_name' => 'Full name',
                    'class_name' => 'Class the student was in, e.g. "JSS 1A"',
                    'subject_name' => 'Subject, e.g. "Mathematics"',
                    'term_name' => 'One of: '.$this->values(TermName::class),
                    'session_name' => 'Academic year, e.g. "2025/2026"',
                    'is_current_term' => 'true for the term in progress now',
                    'ca_score' => 'Continuous assessment score',
                    'exam_score' => 'Exam score',
                    'total' => 'ca_score + exam_score',
                    'grade_letter' => 'One of: '.$this->values(GradeLetter::class),
                    'teacher_name' => 'Teacher who graded it (nullable)',
                ],
            ],
            'attendance_report' => [
                'description' => 'One row per student per day that attendance was taken. Use it for absences, lateness and attendance rates.',
                'columns' => [
                    'student_name' => 'Full name',
                    'class_name' => 'Class, e.g. "JSS 1A"',
                    'attendance_date' => 'The day',
                    'attendance_status' => 'One of: '.$this->values(AttendanceStatus::class),
                    'term_name' => 'One of: '.$this->values(TermName::class),
                    'session_name' => 'Academic year, e.g. "2025/2026"',
                    'is_current_term' => 'true for the term in progress now',
                ],
            ],
            'guardian_directory' => [
                'description' => 'Parents/guardians and the students they are linked to (one row per guardian-student link).',
                'columns' => [
                    'guardian_name' => 'Full name',
                    'email' => 'Email (nullable)',
                    'phone' => 'Phone (nullable)',
                    'student_name' => 'The linked student (nullable)',
                    'relationship' => 'One of: '.$this->values(GuardianRelationship::class),
                    'is_primary' => 'true for the primary guardian',
                ],
            ],
        ];
    }

    /**
     * Guidance for the mistakes a model makes without being told. Each note
     * exists because a real question went wrong.
     *
     * @return list<string>
     */
    public function notes(): array
    {
        return [
            'Every table is already joined and shows names, so one simple SELECT on one table is usually enough. To combine two tables, do not JOIN: filter one with student_name IN (SELECT student_name FROM ... ) as in the examples.',
            'Names contain spaces and mixed case (e.g. class "JSS 3A"). Match loosely: REPLACE(LOWER(class_name), \' \', \'\') = \'jss3a\' or ILIKE with %...%. A class that does not exist simply returns no rows.',
            'When the user names no term for grades or attendance, filter is_current_term = true. "Today" means attendance_date = CURRENT_DATE; "this week" and "this month" use attendance_date ranges.',
            'grade_report has one row per subject, so the performance of a student is AVG(total) grouped by student_name, never the raw rows. Count people with COUNT(DISTINCT student_name).',
            'To count students in a class use COUNT(*) on student_directory with the class_name filter (one row per student, so no duplicates).',
            'guardian_directory has one row per guardian per student, so a guardian with two children appears twice. Use SELECT DISTINCT (or GROUP BY) when listing people so nobody is repeated.',
            'Best or top performance = highest total; per student use AVG(total) grouped by student_name. Attendance rate = present rows / all rows.',
        ];
    }

    /**
     * Worked questions and the query that answers each: the most reliable way
     * to steer a small model. They show the patterns it otherwise gets wrong
     * (averaging per student, "today" meaning CURRENT_DATE, loose class names).
     *
     * @return array<string, string>
     */
    public function examples(): array
    {
        return [
            'Students in JSS 1A' => "SELECT student_name, student_status FROM student_directory WHERE REPLACE(LOWER(class_name), ' ', '') = 'jss1a' ORDER BY student_name",
            'How many students in each class?' => 'SELECT class_name, COUNT(*) AS students FROM student_directory WHERE class_name IS NOT NULL GROUP BY class_name ORDER BY class_name',
            'Best performing students in JSS 1A (grade_report has one row per subject, so average per student)' => "SELECT student_name, ROUND(AVG(total), 1) AS average_score FROM grade_report WHERE REPLACE(LOWER(class_name), ' ', '') = 'jss1a' AND is_current_term GROUP BY student_name ORDER BY average_score DESC",
            'How many students were absent today?' => "SELECT COUNT(DISTINCT student_name) AS absent_today FROM attendance_report WHERE attendance_date = CURRENT_DATE AND attendance_status = 'absent'",
            'Attendance rate per class' => "SELECT class_name, ROUND(100.0 * SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) / COUNT(*), 1) AS attendance_percent FROM attendance_report WHERE is_current_term GROUP BY class_name ORDER BY class_name",
            'Parents of the students in JSS 1A whose average is below 75 (combine tables with IN, not JOIN)' => "SELECT guardian_name, student_name, relationship FROM guardian_directory WHERE student_name IN (SELECT student_name FROM grade_report WHERE REPLACE(LOWER(class_name), ' ', '') = 'jss1a' AND is_current_term GROUP BY student_name HAVING AVG(total) < 75) ORDER BY guardian_name",
            'Teachers on leave' => "SELECT teacher_name, subjects_taught FROM teacher_directory WHERE teacher_status = 'on_leave'",
        ];
    }

    /**
     * The tables only the ministry's agent is told about: one row per school
     * with its headline numbers, for questions that compare schools.
     *
     * @return array<string, array{description: string, columns: array<string, string>}>
     */
    public function ministryTables(): array
    {
        return [
            'school_summary' => [
                'description' => 'One row per school with its headline numbers. Use it to compare, rank or filter schools: "which schools are understaffed?", "lowest attendance", "students per school".',
                'columns' => [
                    'school_name' => 'School name',
                    'school_code' => 'Ministry school code (nullable)',
                    'school_status' => 'One of: '.$this->values(SchoolStatus::class),
                    'school_type' => 'One of: '.$this->values(SchoolType::class).' (nullable)',
                    'school_level' => 'One of: '.$this->values(SchoolLevel::class).' (nullable)',
                    'school_lga' => 'Local government area, lowercase with underscores, e.g. "ikeja", "eti_osa" (nullable)',
                    'school_district' => 'Education district, e.g. "district_1" (nullable)',
                    'active_students' => 'Number of active students',
                    'active_teachers' => 'Number of active teachers',
                    'teachers_on_leave' => 'Number of teachers on leave',
                    'active_classes' => 'Number of active classes',
                    'student_teacher_ratio' => 'active_students per active teacher (null when there are no active teachers)',
                    'attendance_percent' => 'Attendance rate this term as a percentage (null when none recorded)',
                    'average_score' => 'Average total score this term (null when no grades)',
                    'pass_percent' => 'Percent of this term\'s grades that are not F (null when no grades)',
                ],
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function ministryExamples(): array
    {
        return [
            'Which schools are understaffed? (more than 35 students per teacher, or students but no teachers)' => 'SELECT school_name, school_lga, active_students, active_teachers, student_teacher_ratio FROM school_summary WHERE student_teacher_ratio > 35 OR (active_teachers = 0 AND active_students > 0) ORDER BY student_teacher_ratio DESC NULLS FIRST',
            'Which schools have the lowest attendance this term?' => 'SELECT school_name, school_lga, attendance_percent FROM school_summary WHERE attendance_percent IS NOT NULL ORDER BY attendance_percent ASC LIMIT 10',
            'Number of students in each LGA' => 'SELECT school_lga, SUM(active_students) AS students FROM school_summary WHERE school_lga IS NOT NULL GROUP BY school_lga ORDER BY students DESC',
            'Attendance rate by LGA' => "SELECT school_lga, ROUND(100.0 * SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) / COUNT(*), 1) AS attendance_percent FROM attendance_report WHERE is_current_term AND school_lga IS NOT NULL GROUP BY school_lga ORDER BY attendance_percent",
            'Is Mrs Adeyemi on leave, and at which school?' => "SELECT teacher_name, school_name, teacher_status FROM teacher_directory WHERE teacher_name ILIKE '%adeyemi%'",
            'Which teachers are on leave, by school?' => "SELECT school_name, COUNT(*) AS on_leave FROM teacher_directory WHERE teacher_status = 'on_leave' GROUP BY school_name ORDER BY on_leave DESC",
            'Average Mathematics score per school this term' => "SELECT school_name, ROUND(AVG(total), 1) AS average_score FROM grade_report WHERE is_current_term AND subject_name ILIKE 'mathematics' GROUP BY school_name ORDER BY average_score DESC",
        ];
    }

    /**
     * @return list<string>
     */
    public function ministryNotes(): array
    {
        return [
            'Every table above also has school_name, school_lga, school_district and school_type, so label or group rows by school or area with a plain GROUP BY, never a JOIN.',
            'For questions that compare or rank schools, start from school_summary: it already holds each school\'s students, teachers, attendance and scores.',
            'Refer to schools by school_name, never by an id. School names are not unique across areas, so include school_lga when listing them.',
            'Counts across the ministry cover every school the ministry has onboarded. Schools that have not activated yet have no rows.',
        ];
    }

    /**
     * Render the catalog as text for the model.
     */
    public function describe(QueryScope $scope): string
    {
        $ministry = $scope->schoolId === null;

        $lines = [
            'PostgreSQL. Enum-like columns hold lowercase values.',
            $ministry
                ? 'You can see data across all schools; label and group rows by school_name, never by an id.'
                : 'You can only see this school\'s data; rows from other schools are filtered out automatically, so never filter by school_id yourself.',
            '',
        ];

        $tables = $ministry ? [...$this->ministryTables(), ...$this->tables()] : $this->tables();
        $examples = $ministry ? [...$this->ministryExamples(), ...$this->examples()] : $this->examples();
        $notes = $ministry ? [...$this->ministryNotes(), ...$this->notes()] : $this->notes();

        foreach ($tables as $table => $definition) {
            $lines[] = "TABLE {$table} — {$definition['description']}";

            foreach ($definition['columns'] as $column => $note) {
                $lines[] = "  - {$column}: {$note}";
            }

            $lines[] = '';
        }

        $lines[] = 'EXAMPLES (question -> query)';

        foreach ($examples as $question => $query) {
            $lines[] = "  - {$question}";
            $lines[] = "    {$query}";
        }

        $lines[] = '';
        $lines[] = 'RELATIONSHIPS AND TIPS';

        foreach ($notes as $note) {
            $lines[] = "  - {$note}";
        }

        return trim(implode("\n", $lines));
    }

    /**
     * @param  class-string<\BackedEnum>  $enum
     */
    private function values(string $enum): string
    {
        return implode(', ', array_map(fn (\BackedEnum $case): string => (string) $case->value, $enum::cases()));
    }
}
