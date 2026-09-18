<?php

use App\Ai\Agents\SchoolAssistant;
use App\Ai\Query\QueryRunner;
use App\Ai\Query\QueryScope;
use App\Ai\Query\SchemaCatalog;
use App\Ai\Query\SqlGuard;
use App\Ai\Query\UnsafeQueryException;
use App\Ai\Tools\RenderChart;
use App\Ai\Tools\RenderList;
use App\Ai\Tools\RenderTable;
use App\Ai\Tools\RunSqlQuery;
use App\Models\Guardian;
use App\Models\School;
use App\Models\Student;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Laravel\Ai\Tools\Request;

/*
 * The runner reads through separate read-only Postgres connections, which
 * cannot see rows inside the transaction RefreshDatabase wraps each test in.
 * The tests that hit them therefore commit their fixtures and truncate after.
 */
function commitFixtures(): void
{
    while (DB::transactionLevel() > 0) {
        DB::rollBack();
    }
}

function truncateFixtures(): void
{
    DB::statement('TRUNCATE schools, ministry_users RESTART IDENTITY CASCADE');
}

function runnerFor(QueryScope $scope, string $sql): array
{
    return app(QueryRunner::class)->run($scope, $sql)->rows;
}

describe('SqlGuard', function () {
    test('it accepts read-only selects', function (string $sql) {
        expect((new SqlGuard)->validate($sql))->toBe(rtrim(trim($sql), ';'));
    })->with([
        'plain select' => 'SELECT name FROM students',
        'trailing semicolon' => 'SELECT name FROM students;',
        'cte' => 'WITH active AS (SELECT * FROM students WHERE status = \'active\') SELECT count(*) FROM active',
        'join with aggregate' => 'SELECT c.name, count(*) FROM enrollments e JOIN school_classes c ON c.id = e.school_class_id GROUP BY c.name',
        'keyword inside a string literal' => 'SELECT name FROM students WHERE name = \'Drop Table\'',
        'keyword-like column' => 'SELECT updated_at, created_at FROM students',
        'escaped quote in literal' => 'SELECT name FROM students WHERE name = \'O\'\'Neil\'',
    ]);

    test('it rejects anything that is not a single read-only select', function (string $sql) {
        expect(fn () => (new SqlGuard)->validate($sql))->toThrow(UnsafeQueryException::class);
    })->with([
        'empty' => '  ',
        'insert' => 'INSERT INTO students (name) VALUES (\'x\')',
        'update' => 'UPDATE students SET name = \'x\'',
        'delete' => 'DELETE FROM students',
        'drop' => 'DROP TABLE students',
        'stacked statements' => 'SELECT 1; DROP TABLE students',
        'line comment' => 'SELECT 1 -- hidden',
        'block comment' => 'SELECT /* hidden */ 1',
        'data-modifying cte' => 'WITH gone AS (DELETE FROM students RETURNING *) SELECT * FROM gone',
        'select into' => 'SELECT * INTO copy FROM students',
        'select for update' => 'SELECT * FROM students FOR UPDATE',
        'set_config' => 'SELECT set_config(\'app.current_school_id\', \'other\', false)',
        'current_setting' => 'SELECT current_setting(\'app.current_school_id\')',
        'quoted function name' => 'SELECT "pg_sleep"(10)',
        'pg function' => 'SELECT pg_read_file(\'/etc/passwd\')',
        'system catalog' => 'SELECT * FROM pg_roles',
        'information schema' => 'SELECT * FROM information_schema.tables',
        'dollar quoting' => 'SELECT $$x$$',
        'escape string' => 'SELECT E\'\\\'\'',
        'session compared to term' => 'SELECT 1 FROM enrollments e JOIN grades g ON e.academic_session_id = g.academic_term_id',
        'term compared to session' => 'SELECT 1 FROM grades g JOIN enrollments e ON g.academic_term_id = e.academic_session_id',
        'unterminated quote' => 'SELECT \'abc',
        'set statement' => 'SET ROLE postgres',
        'too long' => 'SELECT '.str_repeat('1,', 3000).'1',
    ]);
});

describe('QueryRunner', function () {
    beforeEach(function () {
        commitFixtures();
        config()->set('ai.query.max_rows', 200);

        $this->schoolA = School::factory()->create();
        $this->schoolB = School::factory()->create();

        Student::factory()->for($this->schoolA)->count(3)->create();
        Student::factory()->for($this->schoolB)->count(5)->create();
    });

    afterEach(fn () => truncateFixtures());

    test('a school scope only sees its own school\'s rows', function () {
        $rows = runnerFor(QueryScope::school($this->schoolA->id), 'SELECT school_id FROM students');

        expect($rows)->toHaveCount(3)
            ->and(collect($rows)->pluck('school_id')->unique()->all())->toBe([$this->schoolA->id]);
    });

    test('filtering for another school\'s id in the SQL returns nothing', function () {
        $rows = runnerFor(
            QueryScope::school($this->schoolA->id),
            "SELECT * FROM students WHERE school_id = '{$this->schoolB->id}'",
        );

        expect($rows)->toBeEmpty();
    });

    test('a school scope only sees itself in the schools table', function () {
        $rows = runnerFor(QueryScope::school($this->schoolA->id), 'SELECT id FROM schools');

        expect(collect($rows)->pluck('id')->all())->toBe([$this->schoolA->id]);
    });

    test('pivot tables are isolated through their parent table', function () {
        $guardianA = Guardian::factory()->for($this->schoolA)->create();
        $guardianB = Guardian::factory()->for($this->schoolB)->create();
        $guardianA->students()->attach(Student::query()->withoutGlobalScopes()->where('school_id', $this->schoolA->id)->first());
        $guardianB->students()->attach(Student::query()->withoutGlobalScopes()->where('school_id', $this->schoolB->id)->first());

        $rows = runnerFor(QueryScope::school($this->schoolA->id), 'SELECT guardian_id FROM guardian_student');

        expect(collect($rows)->pluck('guardian_id')->all())->toBe([$guardianA->id]);
    });

    test('the flattened reports are isolated per school too', function () {
        $rows = runnerFor(QueryScope::school($this->schoolA->id), 'SELECT student_name FROM student_directory');
        $ministryRows = runnerFor(QueryScope::ministry(), 'SELECT student_name FROM student_directory');

        expect($rows)->toHaveCount(3)->and($ministryRows)->toHaveCount(8);
    });

    test('the ministry scope sees every school', function () {
        $rows = runnerFor(QueryScope::ministry(), 'SELECT school_id, count(*) AS total FROM students GROUP BY school_id');

        expect(collect($rows)->pluck('total', 'school_id')->all())->toEqualCanonicalizing([
            $this->schoolA->id => 3,
            $this->schoolB->id => 5,
        ]);
    });

    test('the school id setting does not outlive the query', function () {
        runnerFor(QueryScope::school($this->schoolA->id), 'SELECT 1');

        $setting = DB::connection('ai_school')->selectOne("SELECT NULLIF(current_setting('app.current_school_id', true), '') AS value");

        expect($setting->value)->toBeNull();
    });

    test('results are capped and flagged as truncated', function () {
        config()->set('ai.query.max_rows', 2);

        $result = app(QueryRunner::class)->run(QueryScope::ministry(), 'SELECT id FROM students');

        expect($result->rows)->toHaveCount(2)->and($result->truncated)->toBeTrue();
    });

    test('a slow query is cancelled by the timeout', function () {
        config()->set('ai.query.timeout_ms', 50);

        expect(fn () => runnerFor(QueryScope::ministry(), 'SELECT count(*) FROM generate_series(1, 500000000)'))
            ->toThrow(UnsafeQueryException::class, 'statement timeout');
    });

    test('database errors come back as a message the model can act on', function () {
        expect(fn () => runnerFor(QueryScope::ministry(), 'SELECT nonexistent FROM students'))
            ->toThrow(UnsafeQueryException::class, 'column "nonexistent" does not exist');
    });

    test('the roles are read-only by default and hold no write grants', function () {
        expect(fn () => DB::connection('ai_school')->statement('DELETE FROM students'))
            ->toThrow(QueryException::class, 'read-only transaction');

        $connection = DB::connection('ai_school');
        $connection->statement('SET default_transaction_read_only = off');

        expect(fn () => $connection->statement('DELETE FROM students'))
            ->toThrow(QueryException::class, 'permission denied');

        DB::purge('ai_school');
    });

    test('the roles cannot read tables outside the allowlist', function (string $table) {
        expect(fn () => DB::connection('ai_ministry')->select("SELECT * FROM {$table}"))
            ->toThrow(QueryException::class, 'permission denied');
    })->with(['school_users', 'ministry_users', 'school_invitations', 'sessions', 'passkeys']);

    test('the school role fails closed when no school is set', function () {
        $count = DB::connection('ai_school')->selectOne('SELECT count(*) AS total FROM students')->total;

        expect($count)->toBe(0);
    });
});

describe('tools', function () {
    test('run_sql_query returns rows as JSON', function () {
        commitFixtures();
        $school = School::factory()->create();
        Student::factory()->for($school)->count(2)->create();

        $tool = new RunSqlQuery(QueryScope::school($school->id), app(QueryRunner::class));
        $payload = json_decode((string) $tool->handle(new Request(['sql' => 'SELECT count(*) AS total FROM students'])), true);

        expect($payload)->toMatchArray(['columns' => ['total'], 'row_count' => 1, 'truncated' => false])
            ->and($payload['rows'][0]['total'])->toBe(2);

        truncateFixtures();
    });

    test('an empty result tells the model exactly how to answer', function () {
        $tool = new RunSqlQuery(QueryScope::ministry(), app(QueryRunner::class));

        $payload = json_decode((string) $tool->handle(new Request(['sql' => 'SELECT name FROM students WHERE 1 = 0'])), true);

        expect($payload['row_count'])->toBe(0)->and($payload['note'])->toContain('couldn\'t find any matching records');
    });

    test('run_sql_query hands rejections back to the model as text', function () {
        $tool = new RunSqlQuery(QueryScope::ministry(), app(QueryRunner::class));

        $result = (string) $tool->handle(new Request(['sql' => 'DELETE FROM students']));

        expect($result)->toStartWith('Error: ');
    });

    test('display tools refuse to draw nothing', function () {
        expect((string) (new RenderChart)->handle(new Request(['labels' => [], 'values' => []])))->toStartWith('Error: ')
            ->and((string) (new RenderTable)->handle(new Request(['columns' => ['Name'], 'rows' => []])))->toStartWith('Error: ')
            ->and((string) (new RenderList)->handle(new Request(['title' => 'x', 'items' => []])))->toStartWith('Error: ');
    });

    test('render_chart rejects mismatched labels and values', function () {
        $result = (string) (new RenderChart)->handle(new Request(['labels' => ['A', 'B'], 'values' => [1]]));

        expect($result)->toStartWith('Error: ');
    });

    test('render_table rejects rows that do not match the columns', function () {
        $result = (string) (new RenderTable)->handle(new Request(['columns' => ['Name', 'Class'], 'rows' => [['Ada']]]));

        expect($result)->toStartWith('Error: ');
    });
});

describe('SchoolAssistant', function () {
    test('it exposes the query and display tools', function () {
        $agent = new SchoolAssistant(QueryScope::school('school-id'));

        $names = collect($agent->tools())->map(fn ($tool) => $tool->name())->all();

        expect($names)->toBe([
            'run_sql_query', 'render_chart', 'render_table', 'render_list', 'ask_clarifying_question',
        ]);
    });

    test('every table the agent is told about can actually be read by its database roles', function () {
        $granted = collect(DB::select(
            "SELECT table_name FROM information_schema.role_table_grants WHERE grantee = ? AND privilege_type = 'SELECT'",
            [config('database.connections.ai_school.username')],
        ))->pluck('table_name')->all();

        expect(array_keys(app(SchemaCatalog::class)->tables()))->each->toBeIn($granted);
    });

    test('the catalog describes only the flattened reports, never the raw tables', function () {
        expect(array_keys(app(SchemaCatalog::class)->tables()))->not->toContain('enrollments', 'students', 'grades', 'school_users');
    });

    test('the schema is part of the agent\'s instructions', function () {
        $instructions = (string) (new SchoolAssistant(QueryScope::school('school-id')))->instructions();

        expect($instructions)->toContain('TABLE grade_report')->toContain('never filter by school_id');
    });

    test('the catalog tells a school agent not to filter by school', function () {
        $catalog = app(SchemaCatalog::class);

        expect($catalog->describe(QueryScope::school('x')))->toContain('never filter by school_id')
            ->and($catalog->describe(QueryScope::ministry()))->toContain('across all schools');
    });
});
