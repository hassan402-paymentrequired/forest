<?php

namespace App\Actions\Ministry;

use App\Enums\DataQualityIssue;
use App\Enums\WatchlistFlag;
use Illuminate\Support\Collection;

/**
 * Turns school rows into the two ministry to-do lists: the watchlist (schools
 * at risk) and the data-quality report (schools with gaps in what they record).
 */
class SchoolAlerts
{
    /**
     * Schools that trip at least one watchlist rule, most flags first.
     *
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    public function watchlist(Collection $rows): Collection
    {
        return $rows
            ->map(fn (array $row): array => [
                ...$row,
                'flags' => collect(WatchlistFlag::cases())
                    ->map(fn (WatchlistFlag $flag): ?array => ($reason = $flag->evaluate($row))
                        ? ['key' => $flag->value, 'label' => $flag->label(), 'reason' => $reason]
                        : null)
                    ->filter()
                    ->values()
                    ->all(),
            ])
            ->filter(fn (array $row): bool => $row['flags'] !== [])
            ->sortByDesc(fn (array $row): int => count($row['flags']))
            ->values();
    }

    /**
     * Schools with at least one data-quality gap, most issues first.
     *
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    public function dataQuality(Collection $rows): Collection
    {
        return $rows
            ->map(fn (array $row): array => [
                ...$row,
                'issues' => collect(DataQualityIssue::cases())
                    ->map(fn (DataQualityIssue $issue): ?array => ($detail = $issue->evaluate($row))
                        ? ['key' => $issue->value, 'label' => $issue->label(), 'detail' => $detail]
                        : null)
                    ->filter()
                    ->values()
                    ->all(),
            ])
            ->filter(fn (array $row): bool => $row['issues'] !== [])
            ->sortByDesc(fn (array $row): int => count($row['issues']))
            ->values();
    }

    /**
     * How many of the given flagged rows carry each key, for the summary chips.
     *
     * @param  Collection<int, array<string, mixed>>  $flaggedRows
     * @param  class-string<WatchlistFlag|DataQualityIssue>  $enum
     * @return list<array{key: string, label: string, schools: int}>
     */
    public function summary(Collection $flaggedRows, string $enum, string $field): array
    {
        return collect($enum::cases())
            ->map(fn (WatchlistFlag|DataQualityIssue $case): array => [
                'key' => $case->value,
                'label' => $case->label(),
                'schools' => $flaggedRows->filter(fn (array $row): bool => collect($row[$field])->contains('key', $case->value))->count(),
            ])
            ->all();
    }
}
