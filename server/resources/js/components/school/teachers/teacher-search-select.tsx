import { useState } from 'react';
import { MultiSelect } from '@/components/ui/multi-select';
import type { MultiSelectOption } from '@/components/ui/multi-select';
import { useRemoteOptions } from '@/hooks/use-remote-options';
import teachers from '@/routes/teachers';

type TeacherSearchResult = {
    id: string;
    name: string;
    email: string | null;
};

const teacherOption = (teacher: TeacherSearchResult): MultiSelectOption => ({
    value: teacher.id,
    label: teacher.name,
    description: teacher.email ?? undefined,
});

/**
 * Picks one active teacher by searching the server as you type. Submits as
 * `teacher_id`.
 */
export function TeacherSearchSelect({
    id,
    name = 'teacher_id',
    placeholder = 'Search for a teacher',
}: {
    id?: string;
    name?: string;
    placeholder?: string;
}) {
    const [selected, setSelected] = useState<MultiSelectOption[]>([]);
    const { options, loading, failed, setQuery } =
        useRemoteOptions<TeacherSearchResult>(
            (q) => teachers.search.url({ query: { q } }),
            teacherOption,
        );

    return (
        <MultiSelect
            single
            id={id}
            name={name}
            options={options}
            value={selected.map((option) => option.value)}
            selectedOptions={selected}
            onChange={(ids) =>
                setSelected(
                    options.filter((option) => ids.includes(option.value)),
                )
            }
            onSearchChange={setQuery}
            loading={loading}
            placeholder={placeholder}
            searchPlaceholder="Search by name or email..."
            emptyText={
                failed
                    ? "Couldn't load teachers. Try again."
                    : 'No active teachers match your search.'
            }
        />
    );
}
