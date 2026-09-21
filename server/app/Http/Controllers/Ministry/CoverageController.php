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

class CoverageController extends Controller
{
    /**
     * Display which classes and subjects each school offers, and the subjects
     * few schools cover.
     */
    public function index(Request $request, SchoolMetrics $metrics, SystemBreakdowns $breakdowns): Response
    {
        $filter = SchoolFilter::fromRequest($request);
        $rows = $metrics->rows($filter);

        return Inertia::render('ministry/coverage', [
            'filters' => $filter->toArray(),
            'options' => SchoolFilter::options(),
            'totals' => [
                ...$metrics->totals($rows),
                'subjects' => (int) $rows->sum('subjects_active'),
            ],
            'subjects' => $breakdowns->subjectCoverage($filter)->take(20)->values(),
            'schools' => RowPaginator::paginate($rows->sortBy('subjects_active')->values(), $request),
        ]);
    }
}
