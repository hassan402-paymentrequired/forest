<?php

namespace App\Ai\Query;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use PDOException;

/**
 * Executes validated AI SQL on the read-only connection for a scope. Each
 * query gets its own read-only transaction in which the school id and a
 * statement timeout are set with `set_config(..., is_local => true)`, so
 * neither can leak to another query or another request on a reused
 * connection.
 */
class QueryRunner
{
    public function __construct(private SqlGuard $guard) {}

    /**
     * @throws UnsafeQueryException
     */
    public function run(QueryScope $scope, string $sql): QueryResult
    {
        $sql = $this->guard->validate($sql);

        $maxRows = (int) config('ai.query.max_rows', 200);
        $timeoutMs = (int) config('ai.query.timeout_ms', 5000);
        $limited = "SELECT * FROM ({$sql}) AS ai_query LIMIT ".($maxRows + 1);

        $connection = DB::connection($scope->connection);

        try {
            $rows = $connection->transaction(function () use ($connection, $scope, $limited, $timeoutMs): array {
                $connection->statement('SET TRANSACTION READ ONLY');
                $connection->select("SELECT set_config('statement_timeout', ?, true)", [(string) $timeoutMs]);

                if ($scope->schoolId !== null) {
                    $connection->select("SELECT set_config('app.current_school_id', ?, true)", [$scope->schoolId]);
                }

                return $connection->select($limited);
            });
        } catch (QueryException $exception) {
            throw new UnsafeQueryException($this->databaseMessage($exception), previous: $exception);
        }

        $rows = array_values(array_map(fn (object $row): array => (array) $row, $rows));
        $truncated = count($rows) > $maxRows;

        if ($truncated) {
            $rows = array_slice($rows, 0, $maxRows);
        }

        return new QueryResult(
            columns: $rows === [] ? [] : array_keys($rows[0]),
            rows: $rows,
            truncated: $truncated,
        );
    }

    /**
     * The Postgres error text (e.g. `column "x" does not exist`), without
     * the SQL and bindings Laravel appends — enough for the model to fix
     * its query, nothing about the connection.
     */
    private function databaseMessage(QueryException $exception): string
    {
        $previous = $exception->getPrevious();
        $driverError = $previous instanceof PDOException ? ($previous->errorInfo[2] ?? null) : null;

        return 'The query failed: '.($driverError !== null
            ? trim(explode("\n", $driverError)[0])
            : 'database error.');
    }
}
