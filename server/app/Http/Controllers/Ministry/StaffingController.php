<?php

namespace App\Http\Controllers\Ministry;

use App\Actions\Ministry\RowPaginator;
use App\Actions\Ministry\SchoolFilter;
use App\Actions\Ministry\SchoolMetrics;
use App\Enums\WatchlistFlag;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StaffingController extends Controller
{
    /**
     * Display staffing across schools: student to teacher ratios, teachers on
     * leave, and the classes and subjects nobody is covering.
     */
    public function index(Request $request, SchoolMetrics $metrics): Response
    {
        $filter = SchoolFilter::fromRequest($request);
        $rows = $metrics->rows($filter);

        $understaffed = $rows->filter(
            fn (array $row): bool => WatchlistFlag::HighStudentTeacherRatio->evaluate($row) !== null,
        );

        return Inertia::render('ministry/staffing', [
            'filters' => $filter->toArray(),
            'options' => SchoolFilter::options(),
            'totals' => $metrics->totals($rows),
            'threshold' => config('ministry.thresholds.student_teacher_ratio'),
            'understaffed_count' => $understaffed->count(),
            'uncovered' => [
                'classes' => (int) $rows->sum('classes_without_teacher'),
                'subjects' => (int) $rows->sum('subjects_without_teacher'),
            ],
            'schools' => RowPaginator::paginate(
                $rows->sortByDesc(fn (array $row): float => $row['student_teacher_ratio']
                    ?? ($row['students_active'] > 0 ? PHP_INT_MAX : 0))->values(),
                $request,
            ),
        ]);
    }
}
