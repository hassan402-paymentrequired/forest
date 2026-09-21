<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * The flattened reporting views the AI agent reads.
     *
     * @var list<string>
     */
    private const VIEWS = [
        'student_directory',
        'teacher_directory',
        'grade_report',
        'attendance_report',
        'guardian_directory',
    ];

    /**
     * Columns appended to every view so the ministry's agent can label and
     * group rows by school and area without a JOIN (which a small model gets
     * wrong). A school agent only ever sees its own school's values.
     *
     * @var list<string>
     */
    private const SCHOOL_COLUMNS = ['school_name', 'school_lga', 'school_district', 'school_type'];

    /**
     * One row per school with its headline numbers, so cross-school
     * questions ("which schools are understaffed?") are a single SELECT.
     */
    private const SCHOOL_SUMMARY = <<<'SQL'
        SELECT s.*,
               ROUND(s.active_students::numeric / NULLIF(s.active_teachers, 0), 1) AS student_teacher_ratio
        FROM (
            SELECT sch.id AS school_id,
                   sch.name AS school_name,
                   sch.code AS school_code,
                   sch.status AS school_status,
                   sch.type AS school_type,
                   sch.level AS school_level,
                   sch.lga AS school_lga,
                   sch.education_district AS school_district,
                   (SELECT COUNT(*) FROM students st WHERE st.school_id = sch.id AND st.status = 'active') AS active_students,
                   (SELECT COUNT(*) FROM teachers te WHERE te.school_id = sch.id AND te.status = 'active') AS active_teachers,
                   (SELECT COUNT(*) FROM teachers te WHERE te.school_id = sch.id AND te.status = 'on_leave') AS teachers_on_leave,
                   (SELECT COUNT(*) FROM school_classes sc WHERE sc.school_id = sch.id AND sc.status = 'active') AS active_classes,
                   (SELECT ROUND(100.0 * SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1)
                      FROM attendances a
                      JOIN academic_terms t ON t.id = a.academic_term_id AND t.is_current
                     WHERE a.school_id = sch.id) AS attendance_percent,
                   (SELECT ROUND(AVG(g.total), 1)
                      FROM grades g
                      JOIN academic_terms t ON t.id = g.academic_term_id AND t.is_current
                     WHERE g.school_id = sch.id) AS average_score,
                   (SELECT ROUND(100.0 * SUM(CASE WHEN g.grade <> 'f' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1)
                      FROM grades g
                      JOIN academic_terms t ON t.id = g.academic_term_id AND t.is_current
                     WHERE g.school_id = sch.id) AS pass_percent
            FROM schools sch
        ) s
        SQL;

    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        $extras = 'sch.name AS school_name, sch.lga AS school_lga, sch.education_district AS school_district, sch.type AS school_type';

        foreach (self::VIEWS as $view) {
            $definition = $this->definition($view);

            DB::statement("CREATE OR REPLACE VIEW {$view} WITH (security_invoker = true) AS SELECT base.*, {$extras} FROM ({$definition}) base JOIN schools sch ON sch.id = base.school_id");
        }

        DB::statement('CREATE OR REPLACE VIEW school_summary WITH (security_invoker = true) AS '.self::SCHOOL_SUMMARY);
        DB::statement("GRANT SELECT ON school_summary TO {$this->roles()}");
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP VIEW IF EXISTS school_summary');

        foreach (self::VIEWS as $view) {
            $definition = $this->definition($view);

            $columns = collect(DB::select(
                'SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ? ORDER BY ordinal_position',
                [$view],
            ))
                ->pluck('column_name')
                ->reject(fn (string $column): bool => in_array($column, self::SCHOOL_COLUMNS, true))
                ->map(fn (string $column): string => '"'.$column.'"')
                ->implode(', ');

            DB::statement("DROP VIEW {$view}");
            DB::statement("CREATE VIEW {$view} WITH (security_invoker = true) AS SELECT {$columns} FROM ({$definition}) base");
            DB::statement("GRANT SELECT ON {$view} TO {$this->roles()}");
        }
    }

    private function definition(string $view): string
    {
        $definition = DB::selectOne('SELECT pg_get_viewdef(?::regclass, true) AS definition', [$view])->definition;

        return rtrim((string) $definition, "; \n\r\t");
    }

    private function roles(): string
    {
        return collect(['ai_school', 'ai_ministry'])
            ->map(fn (string $connection): string => '"'.str_replace('"', '""', (string) config("database.connections.{$connection}.username")).'"')
            ->implode(', ');
    }
};
