<?php

namespace App\Http\Controllers;

use App\Enums\GuardianRelationship;
use App\Exports\GuardiansExport;
use App\Http\Requests\StoreGuardianRequest;
use App\Http\Requests\UpdateGuardianRequest;
use App\Imports\GuardiansImport;
use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class GuardianController extends Controller
{
    /**
     * Display the school's guardian directory.
     */
    public function index(Request $request): Response
    {
        $guardians = Guardian::query()
            ->with('students:id,name')
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->trim()->toString();

                $query->where(fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%"));
            })
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Guardian $guardian) => [
                'id' => $guardian->id,
                'name' => $guardian->name,
                'email' => $guardian->email,
                'phone' => $guardian->phone,
                'relationship' => $guardian->students->first()?->pivot->relationship->value,
                'is_primary' => (bool) $guardian->students->first()?->pivot->is_primary,
                'students' => $guardian->students->map(fn (Student $student) => [
                    'id' => $student->id,
                    'name' => $student->name,
                ]),
            ]);

        return Inertia::render('school/guardians/index', [
            'guardians' => $guardians,
            'filters' => $request->only(['search']),
            'students' => Student::query()->orderBy('name')->get(['id', 'name']),
            'stats' => [
                'total' => Guardian::query()->count(),
                'primary_contacts' => DB::table('guardian_student')->where('is_primary', true)->count(),
            ],
        ]);
    }

    /**
     * Add a guardian to the school, linked to one or more students.
     */
    public function store(StoreGuardianRequest $request): RedirectResponse
    {
        $guardian = Guardian::create($request->safe()->only(['name', 'email', 'phone']));

        $this->syncStudents(
            $guardian,
            $request->validated('student_ids'),
            GuardianRelationship::from($request->validated('relationship')),
            $request->boolean('is_primary'),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Guardian added.')]);

        return to_route('guardians.index');
    }

    /**
     * Update a guardian's details and linked students.
     */
    public function update(UpdateGuardianRequest $request, Guardian $guardian): RedirectResponse
    {
        $guardian->update($request->safe()->only(['name', 'email', 'phone']));

        $this->syncStudents(
            $guardian,
            $request->validated('student_ids'),
            GuardianRelationship::from($request->validated('relationship')),
            $request->boolean('is_primary'),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Guardian updated.')]);

        return to_route('guardians.index');
    }

    /**
     * Remove a guardian from the school.
     */
    public function destroy(Guardian $guardian): RedirectResponse
    {
        $guardian->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Guardian removed.')]);

        return to_route('guardians.index');
    }

    /**
     * Export the school's guardians as a CSV file.
     */
    public function export(): BinaryFileResponse
    {
        return Excel::download(new GuardiansExport, 'guardians.csv', ExcelFormat::CSV);
    }

    /**
     * Import guardians from an uploaded CSV file.
     */
    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt'],
        ]);

        Excel::import(new GuardiansImport, $request->file('file'));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Guardians imported.')]);

        return to_route('guardians.index');
    }

    /**
     * Replace a guardian's linked students, applying the same relationship
     * and primary-contact flag to each, and clearing that flag on any other
     * guardian for the students marked primary here (only one primary
     * guardian per student).
     *
     * @param  array<int, string>  $studentIds
     */
    private function syncStudents(Guardian $guardian, array $studentIds, GuardianRelationship $relationship, bool $isPrimary): void
    {
        $pivotData = collect($studentIds)->mapWithKeys(fn (string $studentId) => [
            $studentId => ['relationship' => $relationship->value, 'is_primary' => $isPrimary],
        ])->all();

        $guardian->students()->sync($pivotData);

        if ($isPrimary) {
            DB::table('guardian_student')
                ->whereIn('student_id', $studentIds)
                ->where('guardian_id', '!=', $guardian->id)
                ->update(['is_primary' => false]);
        }
    }
}
