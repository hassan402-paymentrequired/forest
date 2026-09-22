<?php

namespace App\Http\Controllers\Ministry;

use App\Actions\Ministry\RowPaginator;
use App\Actions\Ministry\SchoolAlerts;
use App\Actions\Ministry\SchoolFilter;
use App\Actions\Ministry\SchoolMetrics;
use App\Enums\DataQualityIssue;
use App\Http\Controllers\Controller;
use App\Models\School;
use Illuminate\Http\RedirectResponse;
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

    /**
     * Display the full data-quality breakdown for one school: every check,
     * whether it passes, and the detail when it doesn't.
     */
    public function show(School $school, SchoolMetrics $metrics): Response|RedirectResponse
    {
        $row = $metrics->rows(SchoolFilter::forSchool($school))->first();

        if (! $row) {
            Inertia::flash('toast', [
                'type' => 'info',
                'message' => __('There is no data to check yet for :name.', ['name' => $school->name]),
            ]);

            return to_route('schools.show', $school);
        }

        return Inertia::render('ministry/data-quality-show', [
            'school' => [
                'id' => $row['id'],
                'name' => $row['name'],
                'lga_label' => $row['lga_label'],
                'status' => $row['status'],
            ],
            'checks' => collect(DataQualityIssue::cases())->map(function (DataQualityIssue $issue) use ($row): array {
                $gap = $issue->evaluate($row);

                return [
                    'key' => $issue->value,
                    'label' => $issue->label(),
                    'detail' => $gap ?? $issue->passLabel(),
                    'passes' => $gap === null,
                ];
            })->all(),
        ]);
    }
}
