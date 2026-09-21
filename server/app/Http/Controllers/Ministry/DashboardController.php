<?php

namespace App\Http\Controllers\Ministry;

use App\Actions\Ministry\SchoolAlerts;
use App\Actions\Ministry\SchoolFilter;
use App\Actions\Ministry\SchoolMetrics;
use App\Actions\Ministry\SystemBreakdowns;
use App\Enums\SchoolStatus;
use App\Http\Controllers\Controller;
use App\Models\School;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the ministry overview: headline numbers across all schools,
     * the attendance trend and the schools that need attention.
     */
    public function __invoke(
        Request $request,
        SchoolMetrics $metrics,
        SystemBreakdowns $breakdowns,
        SchoolAlerts $alerts,
    ): Response {
        $filter = SchoolFilter::fromRequest($request);
        $rows = $metrics->rows($filter);
        $watchlist = $alerts->watchlist($rows);

        $statusCounts = School::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return Inertia::render('ministry/dashboard', [
            'filters' => $filter->toArray(),
            'options' => SchoolFilter::options(),
            'school_statuses' => collect(SchoolStatus::cases())
                ->mapWithKeys(fn (SchoolStatus $status): array => [$status->value => (int) ($statusCounts[$status->value] ?? 0)])
                ->all(),
            'totals' => $metrics->totals($rows),
            'attendance_trend' => $breakdowns->attendanceTrend($filter),
            'watchlist' => [
                'total' => $watchlist->count(),
                'schools' => $watchlist->take(5)->map(fn (array $row): array => [
                    'id' => $row['id'],
                    'name' => $row['name'],
                    'lga_label' => $row['lga_label'],
                    'flags' => $row['flags'],
                ])->values(),
            ],
            'recent_schools' => School::query()
                ->latest()
                ->limit(5)
                ->get(['id', 'name', 'status', 'created_at', 'activated_at'])
                ->map(fn (School $school): array => [
                    'id' => $school->id,
                    'name' => $school->name,
                    'status' => $school->status->value,
                    'invited_at' => $school->created_at?->toIso8601String(),
                    'activated_at' => $school->activated_at?->toIso8601String(),
                ]),
        ]);
    }
}
