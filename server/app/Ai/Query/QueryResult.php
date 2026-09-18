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
     * @return array{columns: list<string>, row_count: int, truncated: bool, rows: list<array<string, mixed>>}
     */
    public function toArray(): array
    {
        return [
            'columns' => $this->columns,
            'row_count' => count($this->rows),
            'truncated' => $this->truncated,
            'rows' => $this->rows,
        ];
    }
}
