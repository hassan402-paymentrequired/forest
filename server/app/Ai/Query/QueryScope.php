<?php

namespace App\Ai\Query;

use InvalidArgumentException;

/**
 * Who an AI query runs on behalf of. It picks the read-only database
 * connection (and therefore the Postgres role and row-level security
 * policy) the query executes under.
 */
final readonly class QueryScope
{
    private function __construct(
        public string $connection,
        public ?string $schoolId,
    ) {}

    public static function school(string $schoolId): self
    {
        if ($schoolId === '') {
            throw new InvalidArgumentException('A school scope requires a school id.');
        }

        return new self('ai_school', $schoolId);
    }

    public static function ministry(): self
    {
        return new self('ai_ministry', null);
    }
}
