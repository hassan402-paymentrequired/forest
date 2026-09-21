<?php

namespace App\Http\Controllers\Ministry;

use App\Actions\Ministry\SchoolAlerts;
use App\Actions\Ministry\SchoolFilter;
use App\Actions\Ministry\SchoolMetrics;
use App\Enums\MinistryReport;
use App\Exports\SchoolReportExport;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReportController extends Controller
{
    /**
     * Display the reports the ministry can download.
     */
    public function index(Request $request): Response
    {
        $filter = SchoolFilter::fromRequest($request);

        return Inertia::render('ministry/reports', [
            'filters' => $filter->toArray(),
            'options' => SchoolFilter::options(),
            'reports' => collect(MinistryReport::cases())->map(fn (MinistryReport $report): array => [
                'key' => $report->value,
                'label' => $report->label(),
                'description' => $report->description(),
            ])->all(),
        ]);
    }

    /**
     * Download a report as CSV, narrowed by the same filters as the pages.
     */
    public function download(Request $request, MinistryReport $report, SchoolMetrics $metrics, SchoolAlerts $alerts): BinaryFileResponse
    {
        $rows = $this->rowsFor($report, $metrics->rows(SchoolFilter::fromRequest($request)), $alerts);

        return Excel::download(
            new SchoolReportExport($rows, $report->columns()),
            "{$report->value}-".now()->toDateString().'.csv',
            ExcelFormat::CSV,
        );
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    private function rowsFor(MinistryReport $report, Collection $rows, SchoolAlerts $alerts): Collection
    {
        return match ($report) {
            MinistryReport::Watchlist => $alerts->watchlist($rows)->map(fn (array $row): array => [
                ...$row,
                'reasons' => collect($row['flags'])->pluck('reason')->implode('; '),
            ]),
            MinistryReport::DataQuality => $alerts->dataQuality($rows)->map(fn (array $row): array => [
                ...$row,
                'issues_detail' => collect($row['issues'])->pluck('detail')->implode('; '),
            ]),
            default => $rows,
        };
    }
}
