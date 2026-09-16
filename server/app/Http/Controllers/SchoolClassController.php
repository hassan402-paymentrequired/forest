<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSchoolClassRequest;
use App\Http\Requests\UpdateSchoolClassRequest;
use App\Models\SchoolClass;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SchoolClassController extends Controller
{
    /**
     * Display the school's class directory.
     */
    public function index(Request $request): Response
    {
        $classes = SchoolClass::query()
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->trim()->toString();

                $query->where('name', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (SchoolClass $class) => [
                'id' => $class->id,
                'name' => $class->name,
            ]);

        return Inertia::render('school/classes/index', [
            'classes' => $classes,
            'filters' => $request->only(['search']),
            'stats' => [
                'total' => SchoolClass::query()->count(),
            ],
        ]);
    }

    /**
     * Add a class to the school.
     */
    public function store(StoreSchoolClassRequest $request): RedirectResponse
    {
        SchoolClass::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Class added.')]);

        return to_route('classes.index');
    }

    /**
     * Update a class's details.
     */
    public function update(UpdateSchoolClassRequest $request, SchoolClass $class): RedirectResponse
    {
        $class->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Class updated.')]);

        return to_route('classes.index');
    }

    /**
     * Remove a class from the school.
     */
    public function destroy(SchoolClass $class): RedirectResponse
    {
        $class->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Class removed.')]);

        return to_route('classes.index');
    }
}
