<?php

namespace App\Ai\Query;

use App\Enums\AttendanceStatus;
use App\Enums\GradeLetter;
use App\Enums\GuardianRelationship;
use App\Enums\SchoolStatus;
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
            'schools' => [
                'description' => 'One row per school on the platform.',
                'columns' => [
                    'id' => 'ULID primary key',
                    'name' => 'School name',
                    'contact_email' => 'Contact email',
                    'status' => 'One of: '.$this->values(SchoolStatus::class),
                    'activated_at' => 'When the school accepted its invitation (null if not yet)',
                ],
            ],
            'school_classes' => [
                'description' => 'A class/grade group in a school, e.g. "JSS 1A". A class does not store its students; see enrollments.',
                'columns' => [
                    'id' => 'ULID primary key',
                    'school_id' => 'References schools.id',
                    'name' => 'Class name',
                ],
            ],
            'students' => [
                'description' => 'Students. A student\'s class for a given session comes from enrollments, not from this table.',
                'columns' => [
                    'id' => 'ULID primary key',
                    'school_id' => 'References schools.id',
                    'name' => 'Full name',
                    'admission_number' => 'School-issued admission number (nullable)',
                    'admission_date' => 'Date admitted (nullable)',
                    'date_of_birth' => 'Date of birth (nullable)',
                    'email' => 'Email (nullable)',
                    'phone' => 'Phone (nullable)',
                    'status' => 'One of: '.$this->values(StudentStatus::class),
                ],
            ],
            'teachers' => [
                'description' => 'Teaching staff.',
                'columns' => [
                    'id' => 'ULID primary key',
                    'school_id' => 'References schools.id',
                    'name' => 'Full name',
                    'email' => 'Email (nullable)',
                    'phone' => 'Phone (nullable)',
                    'status' => 'One of: '.$this->values(TeacherStatus::class),
                ],
            ],
            'subjects' => [
                'description' => 'Subjects taught at a school, e.g. "Mathematics".',
                'columns' => [
                    'id' => 'ULID primary key',
                    'school_id' => 'References schools.id',
                    'name' => 'Subject name',
                ],
            ],
            'subject_teacher' => [
                'description' => 'Which teachers teach which subjects (many-to-many).',
                'columns' => [
                    'subject_id' => 'References subjects.id',
                    'teacher_id' => 'References teachers.id',
                ],
            ],
            'academic_sessions' => [
                'description' => 'An academic year, e.g. "2025/2026". Contains terms.',
                'columns' => [
                    'id' => 'ULID primary key',
                    'school_id' => 'References schools.id',
                    'name' => 'Session name',
                    'start_date' => 'Start date',
                    'end_date' => 'End date',
                ],
            ],
            'academic_terms' => [
                'description' => 'A term inside an academic session. Exactly one term per school has is_current = true.',
                'columns' => [
                    'id' => 'ULID primary key',
                    'school_id' => 'References schools.id',
                    'academic_session_id' => 'References academic_sessions.id',
                    'name' => 'One of: '.$this->values(TermName::class),
                    'start_date' => 'Start date',
                    'end_date' => 'End date',
                    'is_current' => 'true for the term currently in progress',
                ],
            ],
            'enrollments' => [
                'description' => 'Places a student in a class for an academic session. Use this to find which class a student is in, or how many students a class has.',
                'columns' => [
                    'id' => 'ULID primary key',
                    'school_id' => 'References schools.id',
                    'student_id' => 'References students.id',
                    'school_class_id' => 'References school_classes.id',
                    'academic_session_id' => 'References academic_sessions.id',
                ],
            ],
            'class_teacher_assignments' => [
                'description' => 'The teacher in charge of a class for a term.',
                'columns' => [
                    'id' => 'ULID primary key',
                    'school_id' => 'References schools.id',
                    'school_class_id' => 'References school_classes.id',
                    'teacher_id' => 'References teachers.id',
                    'academic_term_id' => 'References academic_terms.id',
                ],
            ],
            'attendances' => [
                'description' => 'One row per student per day that attendance was taken.',
                'columns' => [
                    'id' => 'ULID primary key',
                    'school_id' => 'References schools.id',
                    'student_id' => 'References students.id',
                    'school_class_id' => 'References school_classes.id',
                    'academic_term_id' => 'References academic_terms.id',
                    'date' => 'The day',
                    'status' => 'One of: '.$this->values(AttendanceStatus::class),
                ],
            ],
            'grades' => [
                'description' => 'A student\'s result in one subject for one term.',
                'columns' => [
                    'id' => 'ULID primary key',
                    'school_id' => 'References schools.id',
                    'student_id' => 'References students.id',
                    'subject_id' => 'References subjects.id',
                    'school_class_id' => 'References school_classes.id',
                    'academic_term_id' => 'References academic_terms.id',
                    'teacher_id' => 'References teachers.id (nullable)',
                    'ca_score' => 'Continuous assessment score',
                    'exam_score' => 'Exam score',
                    'total' => 'ca_score + exam_score',
                    'grade' => 'Letter grade, one of: '.$this->values(GradeLetter::class),
                ],
            ],
            'guardians' => [
                'description' => 'Parents/guardians of students.',
                'columns' => [
                    'id' => 'ULID primary key',
                    'school_id' => 'References schools.id',
                    'name' => 'Full name',
                    'email' => 'Email (nullable)',
                    'phone' => 'Phone (nullable)',
                ],
            ],
            'guardian_student' => [
                'description' => 'Links guardians to their students (many-to-many).',
                'columns' => [
                    'guardian_id' => 'References guardians.id',
                    'student_id' => 'References students.id',
                    'relationship' => 'One of: '.$this->values(GuardianRelationship::class),
                    'is_primary' => 'true for the primary guardian',
                ],
            ],
        ];
    }

    /**
     * Render the catalog as text for the model.
     */
    public function describe(QueryScope $scope): string
    {
        $lines = [
            'Database: PostgreSQL. All ids are ULID strings, not integers. Enum-like columns hold lowercase values.',
            $scope->schoolId !== null
                ? 'You can only see this school\'s data; rows from other schools are filtered out automatically, so never filter by school_id yourself.'
                : 'You can see data across all schools. Group or filter by schools.id / school_id when comparing schools.',
            '',
        ];

        foreach ($this->tables() as $table => $definition) {
            $lines[] = "TABLE {$table} — {$definition['description']}";

            foreach ($definition['columns'] as $column => $note) {
                $lines[] = "  - {$column}: {$note}";
            }

            $lines[] = '';
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
