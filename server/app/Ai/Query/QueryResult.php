<?php

namespace App\Ai\Query;

final readonly class QueryResult
{
    /**
     * @param  list<string>  $columns
     * @param  list<array<string, mixed>>  $rows
     */
    public function __construct(
        public array $columns,
        public array $rows,
        public bool $truncated,
    ) {}

    /**
     * @return array{columns: list<string>, row_count: int, truncated: bool, rows: list<array<string, mixed>>, note?: string}
     */
    public function toArray(): array
    {
        return [
            'columns' => $this->columns,
            'row_count' => count($this->rows),
            'truncated' => $this->truncated,
            'rows' => $this->rows,
            ...($this->rows === [] ? ['note' => 'No rows matched. Reply with only: "I couldn\'t find any matching records." and, only if the question named a person or class, suggest checking the spelling. Say nothing about why, and do not mention data or grades.'] : []),
        ];
    }
}
