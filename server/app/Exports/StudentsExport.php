<?php

namespace App\Exports;

use App\Models\AcademicTerm;
use App\Models\Student;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class StudentsExport implements FromQuery, WithHeadings, WithMapping
{
    private ?string $currentSessionId;

    public function __construct()
    {
        $this->currentSessionId = AcademicTerm::query()->where('is_current', true)->value('academic_session_id');
    }

    /**
     * Get the query used to retrieve the export data.
     */
    public function query(): Builder
    {
        return Student::query()
            ->with([
                'enrollments' => fn ($query) => $this->currentSessionId
                    ? $query->where('academic_session_id', $this->currentSessionId)->with('schoolClass:id,name')
                    : $query->whereRaw('1 = 0'),
                'guardians:id,name',
            ])
            ->orderBy('name');
    }

    /**
     * Get the column headings for the export.
     *
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['Name', 'Email', 'Phone', 'Admission Number', 'Admission Date', 'Class', 'Status', 'Guardians'];
    }

    /**
     * Map a student to a row of export data.
     *
     * @return array<int, string|null>
     */
    public function map($student): array
    {
        return [
            $student->name,
            $student->email,
            $student->phone,
            $student->admission_number,
            $student->admission_date?->toDateString(),
            $student->enrollments->first()?->schoolClass?->name,
            $student->status->value,
            $student->guardians
                ->map(fn ($guardian) => "{$guardian->name} ({$guardian->pivot->relationship->value})")
                ->implode('; '),
        ];
    }
}
