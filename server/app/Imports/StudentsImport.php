<?php

namespace App\Imports;

use App\Enums\StudentStatus;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;

class StudentsImport implements SkipsEmptyRows, ToModel, WithHeadingRow, WithValidation
{
    /**
     * @var Collection<string, SchoolClass>
     */
    private Collection $classesByName;

    public function __construct()
    {
        $this->classesByName = SchoolClass::query()->get()->keyBy(fn (SchoolClass $class) => Str::lower($class->name));
    }

    /**
     * Map a row of import data to a student.
     *
     * @param  array<string, mixed>  $row
     */
    public function model(array $row): ?Student
    {
        $class = $this->classesByName->get(Str::lower(trim((string) ($row['class'] ?? ''))));

        if (! $class) {
            return null;
        }

        return new Student([
            'class_id' => $class->id,
            'name' => $row['name'],
            'email' => $row['email'] ?? null,
            'phone' => $row['phone'] ?? null,
            'admission_number' => $row['admission_number'] ?? null,
            'admission_date' => $row['admission_date'] ?? null,
            'status' => StudentStatus::tryFrom((string) ($row['status'] ?? '')) ?? StudentStatus::Active,
        ]);
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
