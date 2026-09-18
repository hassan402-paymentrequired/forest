<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Tables carrying a `school_id` column, isolated per school.
     *
     * @var list<string>
     */
    private const SCHOOL_SCOPED_TABLES = [
        'teachers',
        'school_classes',
        'students',
        'enrollments',
        'attendances',
        'grades',
        'guardians',
        'academic_sessions',
        'academic_terms',
        'subjects',
        'class_teacher_assignments',
    ];

    /**
     * Pivot tables with no `school_id` of their own, mapped to the parent
     * table (and its key column) their rows are scoped through.
     *
     * @var array<string, array{parent: string, column: string}>
     */
    private const PIVOT_TABLES = [
        'guardian_student' => ['parent' => 'students', 'column' => 'student_id'],
        'subject_teacher' => ['parent' => 'teachers', 'column' => 'teacher_id'],
    ];

    private const SCHOOL_SETTING = "NULLIF(current_setting('app.current_school_id', true), '')";

    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        $schoolRole = $this->role('ai_school');
        $ministryRole = $this->role('ai_ministry');

        foreach ([['ai_school', $schoolRole], ['ai_ministry', $ministryRole]] as [$connection, $role]) {
            $this->createRole($role, (string) config("database.connections.{$connection}.password"));

            DB::statement('GRANT CONNECT ON DATABASE '.$this->quoteIdentifier(DB::connection()->getDatabaseName()).' TO '.$role);
            DB::statement("GRANT USAGE ON SCHEMA public TO {$role}");
        }

        DB::statement('ALTER TABLE schools ENABLE ROW LEVEL SECURITY');
        $this->grantAndPolicy('schools', 'id = '.self::SCHOOL_SETTING, $schoolRole, $ministryRole);

        foreach (self::SCHOOL_SCOPED_TABLES as $table) {
            DB::statement("ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY");
            $this->grantAndPolicy($table, 'school_id = '.self::SCHOOL_SETTING, $schoolRole, $ministryRole);
        }

        foreach (self::PIVOT_TABLES as $table => ['parent' => $parent, 'column' => $column]) {
            DB::statement("ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY");

            // The subquery runs as the querying role, so the parent table's
            // own policy is what limits it to the current school.
            $this->grantAndPolicy(
                $table,
                "EXISTS (SELECT 1 FROM {$parent} WHERE {$parent}.id = {$table}.{$column})",
                $schoolRole,
                $ministryRole,
            );
        }
    }

    /**
     * Roles are cluster-wide and may still be in use by other databases on
     * the same server (e.g. the test database), so they are left in place.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        $schoolRole = $this->role('ai_school');
        $ministryRole = $this->role('ai_ministry');

        $tables = [
            'schools',
            ...self::SCHOOL_SCOPED_TABLES,
            ...array_keys(self::PIVOT_TABLES),
        ];

        foreach ($tables as $table) {
            DB::statement("DROP POLICY IF EXISTS tenant_isolation ON {$table}");
            DB::statement("DROP POLICY IF EXISTS ministry_read_all ON {$table}");
            DB::statement("REVOKE ALL ON {$table} FROM {$schoolRole}, {$ministryRole}");
            DB::statement("ALTER TABLE {$table} DISABLE ROW LEVEL SECURITY");
        }
    }

    private function grantAndPolicy(string $table, string $schoolPredicate, string $schoolRole, string $ministryRole): void
    {
        DB::statement("GRANT SELECT ON {$table} TO {$schoolRole}, {$ministryRole}");

        DB::statement("CREATE POLICY tenant_isolation ON {$table} FOR SELECT TO {$schoolRole} USING ({$schoolPredicate})");
        DB::statement("CREATE POLICY ministry_read_all ON {$table} FOR SELECT TO {$ministryRole} USING (true)");
    }

    private function createRole(string $role, string $password): void
    {
        $quotedPassword = DB::connection()->getPdo()->quote($password);
        $exists = DB::selectOne('SELECT 1 AS present FROM pg_roles WHERE rolname = ?', [trim($role, '"')]);

        DB::statement(($exists ? 'ALTER' : 'CREATE')." ROLE {$role} LOGIN PASSWORD {$quotedPassword} NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS");
        DB::statement("ALTER ROLE {$role} SET default_transaction_read_only = on");
    }

    private function role(string $connection): string
    {
        return $this->quoteIdentifier((string) config("database.connections.{$connection}.username"));
    }

    private function quoteIdentifier(string $identifier): string
    {
        return '"'.str_replace('"', '""', $identifier).'"';
    }
};
