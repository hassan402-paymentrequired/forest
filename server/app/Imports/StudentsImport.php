<?php

namespace App\Imports;

use App\Enums\StudentStatus;
use App\Models\AcademicTerm;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\OnEachRow;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Row;

class StudentsImport implements OnEachRow, SkipsEmptyRows, WithHeadingRow, WithValidation
{
    /**
     * @var Collection<string, SchoolClass>
     */
    private Collection $classesByName;

    private ?string $currentSessionId;

    public function __construct()
    {
        $this->classesByName = SchoolClass::query()->get()->keyBy(fn (SchoolClass $class) => Str::lower($class->name));
        $this->currentSessionId = AcademicTerm::query()->where('is_current', true)->value('academic_session_id');
    }

    /**
     * Match a row's "Class" column to an existing class and, if the school
     * has a current academic session, create the student and enroll them.
     */
    public function onRow(Row $row): void
    {
        $data = $row->toArray();

        if (! $this->currentSessionId) {
            return;
        }

        $class = $this->classesByName->get(Str::lower(trim((string) ($data['class'] ?? ''))));

        if (! $class) {
            return;
        }

        $student = Student::create([
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'admission_number' => $data['admission_number'] ?? null,
            'admission_date' => $data['admission_date'] ?? null,
            'status' => StudentStatus::tryFrom((string) ($data['status'] ?? '')) ?? StudentStatus::Active,
        ]);

        $student->enrollments()->create([
            'school_class_id' => $class->id,
            'academic_session_id' => $this->currentSessionId,
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
