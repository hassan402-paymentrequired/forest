import { useState } from 'react';
import { MultiSelect } from '@/components/ui/multi-select';
import type { MultiSelectOption } from '@/components/ui/multi-select';
import { useRemoteOptions } from '@/hooks/use-remote-options';
import students from '@/routes/students';

type StudentSearchResult = {
    id: string;
    name: string;
    admission_number: string | null;
    class_name: string | null;
};

export function studentOption(student: {
    id: string;
    name: string;
    admission_number: string | null;
    class_name?: string | null;
}): MultiSelectOption {
    return {
        value: student.id,
        label: student.name,
        description:
            [student.admission_number, student.class_name]
                .filter(Boolean)
                .join(' · ') || undefined,
    };
}

/**
 * Picks students by searching the server as you type, so it works for schools
 * with thousands of students. Submits as `student_ids[]`.
 */
export function StudentMultiSelect({
    id,
    name = 'student_ids',
    initialSelected = [],
    placeholder = 'Search and select students',
}: {
    id?: string;
    name?: string;
    initialSelected?: MultiSelectOption[];
    placeholder?: string;
}) {
    const [selected, setSelected] = useState(initialSelected);
    const { options, loading, failed, setQuery } =
        useRemoteOptions<StudentSearchResult>(
            (q) => students.search.url({ query: { q } }),
            studentOption,
        );

    const handleChange = (ids: string[]) => {
        const known = new Map(
            [...selected, ...options].map((option) => [option.value, option]),
        );

        setSelected(
            ids.flatMap((studentId) => {
                const option = known.get(studentId);

                return option ? [option] : [];
            }),
        );
    };

    return (
        <MultiSelect
            id={id}
            name={name}
            options={options}
            value={selected.map((option) => option.value)}
            selectedOptions={selected}
            onChange={handleChange}
            onSearchChange={setQuery}
            loading={loading}
            placeholder={placeholder}
            searchPlaceholder="Search by name or admission number..."
            emptyText={
                failed
                    ? "Couldn't load students. Try again."
                    : 'No students match your search.'
            }
        />
    );
}
