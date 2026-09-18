<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Flattened, name-based views over the school tables. They are what the
     * AI agent is shown: every join is already done, so a small model writes
     * one simple SELECT instead of getting multi-table joins wrong.
     *
     * `security_invoker` makes each view run with the privileges of whoever
     * queries it, so the row-level security on the tables underneath still
     * applies (a view runs as its owner by default, which would bypass it).
     *
     * @var array<string, string>
     */
    private const VIEWS = [
        'student_directory' => <<<'SQL'
            SELECT st.school_id,
                   st.name AS student_name,
                   st.admission_number,
                   st.status AS student_status,
                   st.date_of_birth,
                   st.admission_date,
                   st.email,
                   st.phone,
                   sc.name AS class_name
            FROM students st
            LEFT JOIN academic_terms current_term
                   ON current_term.school_id = st.school_id AND current_term.is_current
            LEFT JOIN enrollments en
                   ON en.student_id = st.id AND en.academic_session_id = current_term.academic_session_id
            LEFT JOIN school_classes sc ON sc.id = en.school_class_id
            SQL,
        'teacher_directory' => <<<'SQL'
            SELECT te.school_id,
                   te.name AS teacher_name,
                   te.email,
                   te.phone,
                   te.status AS teacher_status,
                   (SELECT string_agg(sub.name, ', ' ORDER BY sub.name)
                      FROM subject_teacher st_link
                      JOIN subjects sub ON sub.id = st_link.subject_id
                     WHERE st_link.teacher_id = te.id) AS subjects_taught,
                   (SELECT string_agg(sc.name, ', ' ORDER BY sc.name)
                      FROM class_teacher_assignments cta
                      JOIN academic_terms t ON t.id = cta.academic_term_id AND t.is_current
                      JOIN school_classes sc ON sc.id = cta.school_class_id
                     WHERE cta.teacher_id = te.id) AS classes_in_charge
            FROM teachers te
            SQL,
        'grade_report' => <<<'SQL'
            SELECT g.school_id,
                   st.name AS student_name,
                   sc.name AS class_name,
                   sub.name AS subject_name,
                   t.name AS term_name,
                   se.name AS session_name,
                   t.is_current AS is_current_term,
                   g.ca_score,
                   g.exam_score,
                   g.total,
                   g.grade AS grade_letter,
                   te.name AS teacher_name
            FROM grades g
            JOIN students st ON st.id = g.student_id
            JOIN school_classes sc ON sc.id = g.school_class_id
            JOIN subjects sub ON sub.id = g.subject_id
            JOIN academic_terms t ON t.id = g.academic_term_id
            JOIN academic_sessions se ON se.id = t.academic_session_id
            LEFT JOIN teachers te ON te.id = g.teacher_id
            SQL,
        'attendance_report' => <<<'SQL'
            SELECT a.school_id,
                   st.name AS student_name,
                   sc.name AS class_name,
                   a.date AS attendance_date,
                   a.status AS attendance_status,
                   t.name AS term_name,
                   se.name AS session_name,
                   t.is_current AS is_current_term
            FROM attendances a
            JOIN students st ON st.id = a.student_id
            JOIN school_classes sc ON sc.id = a.school_class_id
            JOIN academic_terms t ON t.id = a.academic_term_id
            JOIN academic_sessions se ON se.id = t.academic_session_id
            SQL,
        'guardian_directory' => <<<'SQL'
            SELECT gu.school_id,
                   gu.name AS guardian_name,
                   gu.email,
                   gu.phone,
                   st.name AS student_name,
                   link.relationship,
                   link.is_primary
            FROM guardians gu
            LEFT JOIN guardian_student link ON link.guardian_id = gu.id
            LEFT JOIN students st ON st.id = link.student_id
            SQL,
    ];

    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        $roles = collect(['ai_school', 'ai_ministry'])
            ->map(fn (string $connection): string => '"'.str_replace('"', '""', (string) config("database.connections.{$connection}.username")).'"')
            ->implode(', ');

        foreach (self::VIEWS as $view => $definition) {
            DB::statement("CREATE OR REPLACE VIEW {$view} WITH (security_invoker = true) AS {$definition}");
            DB::statement("GRANT SELECT ON {$view} TO {$roles}");
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        foreach (array_keys(self::VIEWS) as $view) {
            DB::statement("DROP VIEW IF EXISTS {$view}");
        }
    }
};
