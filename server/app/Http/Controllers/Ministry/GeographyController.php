<?php

namespace App\Http\Controllers\Ministry;

use App\Actions\Ministry\SchoolFilter;
use App\Actions\Ministry\SchoolMetrics;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GeographyController extends Controller
{
    /**
     * Display the same headline numbers rolled up by LGA and education
     * district. Schools that haven't been given a location are counted apart.
     */
    public function index(Request $request, SchoolMetrics $metrics): Response
    {
        $filter = SchoolFilter::fromRequest($request);
        $rows = $metrics->rows($filter);

        return Inertia::render('ministry/geography', [
            'filters' => $filter->toArray(),
            'options' => SchoolFilter::options(),
            'totals' => $metrics->totals($rows),
            'unlocated_schools' => $rows->whereNull('lga')->count(),
            'by_lga' => $metrics->groupedTotals($rows, 'lga', 'lga_label'),
            'by_district' => $metrics->groupedTotals($rows, 'education_district', 'district_label'),
        ]);
    }
}
