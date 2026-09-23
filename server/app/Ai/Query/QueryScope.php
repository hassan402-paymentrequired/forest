<?php

namespace App\Ai\Query;

use InvalidArgumentException;

/**
 * Who an AI query runs on behalf of. It picks the read-only database
 * connection (and therefore the Postgres role and row-level security
 * policy) the query executes under, and how many rows a result may carry
 * back into the model's context.
 */
final readonly class QueryScope
{
    private function __construct(
        public string $connection,
        public ?string $schoolId,
        public int $maxRows,
    ) {}

    public static function school(string $schoolId): self
    {
        if ($schoolId === '') {
            throw new InvalidArgumentException('A school scope requires a school id.');
        }

        return new self('ai_school', $schoolId, self::configuredMaxRows());
    }

    /**
     * A ministry query reads across every school, so the same SELECT returns
     * an order of magnitude more rows than a school's would. The row cap is
     * tightened to match, because the result is spent from the same context
     * window that holds the schema (see `SchoolAssistant::providerOptions()`).
     */
    public static function ministry(): self
    {
        return new self('ai_ministry', null, min(
            self::configuredMaxRows(),
            (int) config('ai.query.ministry_max_rows', 60),
        ));
    }

    private static function configuredMaxRows(): int
    {
        return (int) config('ai.query.max_rows', 200);
    }
}
