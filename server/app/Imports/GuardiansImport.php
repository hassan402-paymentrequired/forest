<?php

namespace App\Imports;

use App\Enums\GuardianRelationship;
use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\OnEachRow;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Row;

class GuardiansImport implements OnEachRow, SkipsEmptyRows, WithHeadingRow, WithValidation
{
    /**
     * @var Collection<string, Student>
     */
    private Collection $studentsByAdmissionNumber;

    public function __construct()
    {
        $this->studentsByAdmissionNumber = Student::query()
            ->whereNotNull('admission_number')
            ->get()
            ->keyBy(fn (Student $student) => Str::lower((string) $student->admission_number));
    }

    /**
     * Resolve a row's "Children" column (e.g. "Ada Bello (ADM-1001); Ike Bello (ADM-1002)")
     * against the school's students by admission number, create the guardian, and link them.
     */
    public function onRow(Row $row): void
    {
        $data = $row->toArray();

        $studentIds = collect(explode(';', (string) ($data['children'] ?? '')))
            ->map(function (string $entry) {
                if (preg_match('/\(([^)]+)\)/', $entry, $matches)) {
                    return $this->studentsByAdmissionNumber->get(Str::lower(trim($matches[1])))?->id;
                }

                return null;
            })
            ->filter()
            ->values();

        if ($studentIds->isEmpty()) {
            return;
        }

        $guardian = Guardian::create([
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
        ]);

        $relationship = GuardianRelationship::tryFrom((string) ($data['relationship'] ?? '')) ?? GuardianRelationship::Guardian;
        $isPrimary = in_array(strtolower((string) ($data['primary'] ?? '')), ['yes', 'true', '1'], true);

        $pivotData = $studentIds->mapWithKeys(fn (string $studentId) => [
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
     * Get the validation rules for each row.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
        ];
    }
}
