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
     * The result as the model receives it. Null values are dropped from each
     * row: they carry no information, and every one of them is spent from the
     * same context window that holds the schema, which a ministry-wide result
     * can otherwise exhaust on its own.
     *
     * @return array{columns: list<string>, row_count: int, truncated: bool, rows: list<array<string, mixed>>, note?: string}
     */
    public function toArray(): array
    {
        $rows = array_map(
            fn (array $row): array => array_filter($row, fn (mixed $value): bool => $value !== null),
            $this->rows,
        );

        $droppedNulls = $rows !== [] && array_sum(array_map('count', $rows)) < count($rows) * count($this->columns);

        return [
            'columns' => $this->columns,
            'row_count' => count($rows),
            'truncated' => $this->truncated,
            'rows' => $rows,
            ...match (true) {
                $this->rows === [] => ['note' => 'No rows matched. Reply with only: "I couldn\'t find any matching records." and, only if the question named a person or class, suggest checking the spelling. Say nothing about why, and do not mention data or grades.'],
                $droppedNulls => ['note' => 'A column missing from a row has no value recorded for it.'],
                default => [],
            },
        ];
    }
}
