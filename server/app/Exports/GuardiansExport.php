<?php

namespace App\Exports;

use App\Models\Guardian;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class GuardiansExport implements FromQuery, WithHeadings, WithMapping
{
    /**
     * Get the query used to retrieve the export data.
     */
    public function query(): Builder
    {
        return Guardian::query()->with('students:id,name,admission_number')->orderBy('name');
    }

    /**
     * Get the column headings for the export.
     *
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['Name', 'Email', 'Phone', 'Relationship', 'Primary', 'Children'];
    }

    /**
     * Map a guardian to a row of export data.
     *
     * @return array<int, string|null>
     */
    public function map($guardian): array
    {
        $firstPivot = $guardian->students->first()?->pivot;

        return [
            $guardian->name,
            $guardian->email,
            $guardian->phone,
            $firstPivot?->relationship->value,
            $firstPivot?->is_primary ? 'yes' : 'no',
            $guardian->students
                ->map(fn ($student) => $student->admission_number
                    ? "{$student->name} ({$student->admission_number})"
                    : $student->name)
                ->implode('; '),
        ];
    }
}
