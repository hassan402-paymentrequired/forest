<?php

namespace App\Http\Controllers\Ministry;

use App\Actions\Ministry\RowPaginator;
use App\Actions\Ministry\SchoolAlerts;
use App\Actions\Ministry\SchoolFilter;
use App\Actions\Ministry\SchoolMetrics;
use App\Enums\WatchlistFlag;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WatchlistController extends Controller
{
    /**
     * Display the schools at risk, and which rules each one tripped.
     */
    public function index(Request $request, SchoolMetrics $metrics, SchoolAlerts $alerts): Response
    {
        $filter = SchoolFilter::fromRequest($request);
        $rows = $metrics->rows($filter);
        $flagged = $alerts->watchlist($rows);

        $flag = WatchlistFlag::tryFrom((string) $request->query('flag'));

        $visible = $flag
            ? $flagged->filter(fn (array $row): bool => collect($row['flags'])->contains('key', $flag->value))->values()
            : $flagged;

        return Inertia::render('ministry/watchlist', [
            'filters' => [...$filter->toArray(), 'flag' => $flag?->value ?? ''],
            'options' => SchoolFilter::options(),
            'thresholds' => config('ministry.thresholds'),
            'total_schools' => $rows->count(),
            'flagged_schools' => $flagged->count(),
            'summary' => $alerts->summary($flagged, WatchlistFlag::class, 'flags'),
            'schools' => RowPaginator::paginate(
                $visible->map(fn (array $row): array => collect($row)->only([
                    'id', 'name', 'lga_label', 'status', 'attendance_rate', 'student_teacher_ratio', 'pass_rate', 'flags',
                ])->all())->values(),
                $request,
            ),
        ]);
    }
}
