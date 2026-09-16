<?php

namespace App\Exports;

use App\Models\Student;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class StudentsExport implements FromQuery, WithHeadings, WithMapping
{
    /**
     * Get the query used to retrieve the export data.
     */
    public function query(): Builder
    {
        return Student::query()->with(['schoolClass:id,name', 'guardians:id,name'])->orderBy('name');
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
            $student->schoolClass->name,
            $student->status->value,
            $student->guardians
                ->map(fn ($guardian) => "{$guardian->name} ({$guardian->pivot->relationship->value})")
                ->implode('; '),
        ];
    }
}
