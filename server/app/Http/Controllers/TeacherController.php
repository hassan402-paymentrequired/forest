<?php

namespace App\Http\Controllers;

use App\Enums\TeacherStatus;
use App\Http\Requests\StoreTeacherRequest;
use App\Http\Requests\UpdateTeacherRequest;
use App\Models\Teacher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TeacherController extends Controller
{
    /**
     * Display the school's teacher directory.
     */
    public function index(Request $request): Response
    {
        $teachers = Teacher::query()
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->trim()->toString();

                $query->where(fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"));
            })
            ->when($request->string('status')->isNotEmpty(), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Teacher $teacher) => [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'phone' => $teacher->phone,
                'subjects' => $teacher->subjects ?? [],
                'status' => $teacher->status->value,
            ]);

        return Inertia::render('school/teachers/index', [
            'teachers' => $teachers,
            'filters' => $request->only(['search', 'status']),
            'stats' => [
                'total' => Teacher::query()->count(),
                'active' => Teacher::query()->where('status', TeacherStatus::Active)->count(),
                'on_leave' => Teacher::query()->where('status', TeacherStatus::OnLeave)->count(),
                'transferred' => Teacher::query()->where('status', TeacherStatus::Transferred)->count(),
            ],
        ]);
    }

    /**
     * Add a teacher to the school.
     */
    public function store(StoreTeacherRequest $request): RedirectResponse
    {
        Teacher::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Teacher added.')]);

        return to_route('teachers.index');
    }

    /**
     * Update a teacher's details.
     */
    public function update(UpdateTeacherRequest $request, Teacher $teacher): RedirectResponse
    {
        $teacher->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Teacher updated.')]);

        return to_route('teachers.index');
    }

    /**
     * Remove a teacher from the school.
     */
    public function destroy(Teacher $teacher): RedirectResponse
    {
        $teacher->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Teacher removed.')]);

        return to_route('teachers.index');
    }
}
