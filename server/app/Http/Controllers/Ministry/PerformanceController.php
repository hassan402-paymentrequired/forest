<?php

namespace App\Http\Controllers\Ministry;

use App\Actions\Ministry\RowPaginator;
use App\Actions\Ministry\SchoolFilter;
use App\Actions\Ministry\SchoolMetrics;
use App\Actions\Ministry\SystemBreakdowns;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PerformanceController extends Controller
{
    /**
     * Display academic performance across schools: the grade spread, subject
     * averages, a school ranking and a side-by-side comparison.
     */
    public function index(Request $request, SchoolMetrics $metrics, SystemBreakdowns $breakdowns): Response
    {
        $filter = SchoolFilter::fromRequest($request);
        $rows = $metrics->rows($filter);

        $compareIds = collect((array) $request->query('compare', []))
            ->filter(fn ($id): bool => is_string($id) && $id !== '')
            ->take(config('ministry.comparison_limit'))
            ->values();

        return Inertia::render('ministry/performance', [
            'filters' => $filter->toArray(),
            'options' => SchoolFilter::options(),
            'totals' => $metrics->totals($rows),
            'distribution' => $breakdowns->gradeDistribution($filter),
            'subjects' => $breakdowns->subjectPerformance($filter),
            'compare' => [
                'limit' => config('ministry.comparison_limit'),
                'selected' => $compareIds,
                'schools' => $rows->whereIn('id', $compareIds)->values(),
                'choices' => $rows->map(fn (array $row): array => ['id' => $row['id'], 'name' => $row['name']])->values(),
            ],
            'schools' => RowPaginator::paginate(
                $rows->sortByDesc(fn (array $row): float => $row['average_score'] ?? -1)->values(),
                $request,
            ),
        ]);
    }
}
