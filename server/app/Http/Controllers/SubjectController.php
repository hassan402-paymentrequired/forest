<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSubjectRequest;
use App\Http\Requests\UpdateSubjectRequest;
use App\Models\Subject;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SubjectController extends Controller
{
    /**
     * Display the school's subject directory.
     */
    public function index(Request $request): Response
    {
        $subjects = Subject::query()
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->trim()->toString();

                $query->where('name', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Subject $subject) => [
                'id' => $subject->id,
                'name' => $subject->name,
            ]);

        return Inertia::render('school/subjects/index', [
            'subjects' => $subjects,
            'filters' => $request->only(['search']),
            'stats' => [
                'total' => Subject::query()->count(),
            ],
        ]);
    }

    /**
     * Add a subject to the school.
     */
    public function store(StoreSubjectRequest $request): RedirectResponse
    {
        Subject::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Subject added.')]);

        return to_route('subjects.index');
    }

    /**
     * Update a subject's details.
     */
    public function update(UpdateSubjectRequest $request, Subject $subject): RedirectResponse
    {
        $subject->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Subject updated.')]);

        return to_route('subjects.index');
    }

    /**
     * Remove a subject from the school.
     */
    public function destroy(Subject $subject): RedirectResponse
    {
        $subject->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Subject removed.')]);

        return to_route('subjects.index');
    }
}
