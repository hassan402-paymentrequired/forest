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

class EnrolmentController extends Controller
{
    /**
     * Display enrolment across schools: students by status, enrolment per
     * session, and where the students are.
     */
    public function index(Request $request, SchoolMetrics $metrics, SystemBreakdowns $breakdowns): Response
    {
        $filter = SchoolFilter::fromRequest($request);
        $rows = $metrics->rows($filter);

        return Inertia::render('ministry/enrolment', [
            'filters' => $filter->toArray(),
            'options' => SchoolFilter::options(),
            'totals' => $metrics->totals($rows),
            'statuses' => $breakdowns->studentStatuses($filter),
            'by_session' => $breakdowns->enrolmentBySession($filter),
            'by_lga' => $metrics->groupedTotals($rows, 'lga', 'lga_label')->take(10)->values(),
            'schools' => RowPaginator::paginate($rows->sortByDesc('students_active')->values(), $request),
        ]);
    }
}
