<?php

namespace App\Http\Controllers;

use App\Enums\GuardianRelationship;
use App\Enums\RecordStatus;
use App\Exports\GuardiansExport;
use App\Http\Requests\StoreGuardianRequest;
use App\Http\Requests\UpdateGuardianRequest;
use App\Http\Requests\UpdateRecordStatusRequest;
use App\Imports\GuardiansImport;
use App\Models\AcademicTerm;
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
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        $guardians = Guardian::query()
            ->with(['students' => fn ($query) => $query
                ->select('students.id', 'students.name', 'students.admission_number')
                ->with(['enrollments' => fn ($query) => $currentTerm
                    ? $query->where('academic_session_id', $currentTerm->academic_session_id)->with('schoolClass:id,name')
                    : $query->whereRaw('1 = 0')])])
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->trim()->toString();

                $query->where(fn ($query) => $query
                    ->whereLike('name', "%{$search}%")
                    ->orWhereLike('email', "%{$search}%")
                    ->orWhereLike('phone', "%{$search}%"));
            })
            ->when($request->string('status')->isNotEmpty(), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Guardian $guardian) => [
                'id' => $guardian->id,
                'name' => $guardian->name,
                'email' => $guardian->email,
                'phone' => $guardian->phone,
                'added_at' => $guardian->created_at?->toDateString(),
                'status' => $guardian->status->value,
                'relationship' => $guardian->students->first()?->pivot->relationship->value,
                'is_primary' => (bool) $guardian->students->first()?->pivot->is_primary,
                'students' => $guardian->students->map(fn (Student $student) => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'admission_number' => $student->admission_number,
                    'class_name' => $student->enrollments->first()?->schoolClass?->name,
                    'relationship' => $student->pivot->relationship->value,
                    'is_primary' => (bool) $student->pivot->is_primary,
                ]),
            ]);

        return Inertia::render('school/guardians/index', [
            'guardians' => $guardians,
            'filters' => $request->only(['search', 'status']),
            'has_students' => Student::query()->exists(),
            'stats' => [
                'total' => Guardian::query()->count(),
                'active' => Guardian::query()->where('status', RecordStatus::Active)->count(),
                'primary_contacts' => DB::table('guardian_student')->where('is_primary', true)->count(),
            ],
        ]);
    }

    /**
     * Display a guardian's profile and the students in their care.
     */
    public function show(Guardian $guardian): Response
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        $students = $guardian->students()
            ->with(['enrollments' => fn ($query) => $currentTerm
                ? $query->where('academic_session_id', $currentTerm->academic_session_id)->with('schoolClass:id,name')
                : $query->whereRaw('1 = 0')])
            ->get()
            ->map(fn (Student $student) => [
                'id' => $student->id,
                'name' => $student->name,
                'admission_number' => $student->admission_number,
                'class_name' => $student->enrollments->first()?->schoolClass?->name,
                'relationship' => $student->pivot->relationship->value,
                'is_primary' => (bool) $student->pivot->is_primary,
            ]);

        return Inertia::render('school/guardians/show', [
            'guardian' => [
                'id' => $guardian->id,
                'name' => $guardian->name,
                'email' => $guardian->email,
                'phone' => $guardian->phone,
                'added_at' => $guardian->created_at?->toDateString(),
                'status' => $guardian->status->value,
            ],
            'students' => $students,
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

        return back();
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

    /**
     * Change a guardian's status, e.g. to deactivate or reactivate it.
     */
    public function updateStatus(UpdateRecordStatusRequest $request, Guardian $guardian): RedirectResponse
    {
        $guardian->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Guardian status updated.')]);

        return back();
    }
}
