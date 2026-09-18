<?php

namespace App\Ai\Tools;

use App\Ai\Query\QueryRunner;
use App\Ai\Query\QueryScope;
use App\Ai\Query\UnsafeQueryException;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class RunSqlQuery implements Tool
{
    public function __construct(private QueryScope $scope, private QueryRunner $runner) {}

    public function name(): string
    {
        return 'run_sql_query';
    }

    public function description(): Stringable|string
    {
        return 'Run one read-only PostgreSQL SELECT query against the school database and get the rows back as JSON. '
            .'Only a single SELECT (or WITH ... SELECT) is allowed: no semicolons, comments, or data changes. '
            .'Results are capped, so aggregate with COUNT/AVG/GROUP BY instead of selecting everything. '
            .'If the query errors, read the message, fix the SQL, and try again.';
    }

    public function handle(Request $request): Stringable|string
    {
        try {
            $result = $this->runner->run($this->scope, (string) $request->string('sql'));
        } catch (UnsafeQueryException $exception) {
            return 'Error: '.$exception->getMessage();
        }

        return json_encode($result->toArray(), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR);
    }

    /**
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'sql' => $schema->string()
                ->description('A single PostgreSQL SELECT statement.')
                ->required(),
        ];
    }
}
