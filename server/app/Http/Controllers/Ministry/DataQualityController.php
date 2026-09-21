<?php

namespace App\Http\Controllers\Ministry;

use App\Actions\Ministry\RowPaginator;
use App\Actions\Ministry\SchoolAlerts;
use App\Actions\Ministry\SchoolFilter;
use App\Actions\Ministry\SchoolMetrics;
use App\Enums\DataQualityIssue;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DataQualityController extends Controller
{
    /**
     * Display the schools with gaps in what they record, and which gaps.
     */
    public function index(Request $request, SchoolMetrics $metrics, SchoolAlerts $alerts): Response
    {
        $filter = SchoolFilter::fromRequest($request);
        $rows = $metrics->rows($filter);
        $flagged = $alerts->dataQuality($rows);

        $issue = DataQualityIssue::tryFrom((string) $request->query('issue'));

        $visible = $issue
            ? $flagged->filter(fn (array $row): bool => collect($row['issues'])->contains('key', $issue->value))->values()
            : $flagged;

        return Inertia::render('ministry/data-quality', [
            'filters' => [...$filter->toArray(), 'issue' => $issue?->value ?? ''],
            'options' => SchoolFilter::options(),
            'total_schools' => $rows->count(),
            'flagged_schools' => $flagged->count(),
            'summary' => $alerts->summary($flagged, DataQualityIssue::class, 'issues'),
            'schools' => RowPaginator::paginate(
                $visible->map(fn (array $row): array => collect($row)->only([
                    'id', 'name', 'lga_label', 'status', 'issues',
                ])->all())->values(),
                $request,
            ),
        ]);
    }
}
