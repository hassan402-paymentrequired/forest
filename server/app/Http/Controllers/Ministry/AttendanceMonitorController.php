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

class AttendanceMonitorController extends Controller
{
    /**
     * Display attendance across schools: the rate, its weekly trend, the
     * present/absent split and the schools with the lowest attendance.
     */
    public function index(Request $request, SchoolMetrics $metrics, SystemBreakdowns $breakdowns): Response
    {
        $filter = SchoolFilter::fromRequest($request);
        $rows = $metrics->rows($filter);

        return Inertia::render('ministry/attendance', [
            'filters' => $filter->toArray(),
            'options' => SchoolFilter::options(),
            'totals' => $metrics->totals($rows),
            'threshold' => config('ministry.thresholds.attendance_rate'),
            'below_threshold' => $rows->filter(
                fn (array $row): bool => $row['attendance_rate'] !== null
                    && $row['attendance_rate'] < config('ministry.thresholds.attendance_rate'),
            )->count(),
            'breakdown' => $breakdowns->attendanceBreakdown($filter),
            'trend' => $breakdowns->attendanceTrend($filter),
            'schools' => RowPaginator::paginate(
                $rows->sortBy(fn (array $row): float => $row['attendance_rate'] ?? PHP_INT_MAX)->values(),
                $request,
            ),
        ]);
    }
}
