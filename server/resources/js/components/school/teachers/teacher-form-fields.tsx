import { parseISO } from 'date-fns';
import { useState } from 'react';
import DateField from '@/components/date-field';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { statusLabel } from './teacher';
import type { SubjectOption, Teacher } from './teacher';

/**
 * The fields shared by the add and edit teacher dialogs. Pass `teacher` to
 * prefill and to show the status field.
 */
export function TeacherFormFields({
    idPrefix,
    subjects,
    errors,
    teacher,
}: {
    idPrefix: string;
    subjects: SubjectOption[];
    errors: Partial<Record<string, string>>;
    teacher?: Teacher;
}) {
    const [subjectIds, setSubjectIds] = useState<string[]>(
        teacher?.subjects.map((subject) => subject.id) ?? [],
    );
    // A subject assigned before it was deactivated isn't offered any more, but
    // it must stay selected (and keep its label) until the user removes it.
    const knownSubjects = new Map(
        [...(teacher?.subjects ?? []), ...subjects].map((subject) => [
            subject.id,
            { value: subject.id, label: subject.name },
        ]),
    );
    const selectedSubjects = subjectIds.flatMap((id) => {
        const option = knownSubjects.get(id);

        return option ? [option] : [];
    });
    const [joinedAt, setJoinedAt] = useState<Date | undefined>(
        teacher
            ? teacher.joined_at
                ? parseISO(teacher.joined_at)
                : undefined
            : new Date(),
    );

    return (
        <>
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-name`}>Name</Label>
                <Input
                    id={`${idPrefix}-name`}
                    name="name"
                    required
                    defaultValue={teacher?.name}
                    autoComplete="off"
                    placeholder="e.g. Mrs. Adebayo"
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor={`${idPrefix}-email`}>Email</Label>
                    <Input
                        id={`${idPrefix}-email`}
                        type="email"
                        name="email"
                        defaultValue={teacher?.email ?? ''}
                        autoComplete="off"
                        placeholder="e.g. adebayo@example.com"
                    />
                    <InputError message={errors.email} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
                    <Input
                        id={`${idPrefix}-phone`}
                        name="phone"
                        defaultValue={teacher?.phone ?? ''}
                        autoComplete="off"
                        placeholder="e.g. 0801 234 5678"
                    />
                    <InputError message={errors.phone} />
                </div>
            </div>

            <DateField
                label="Joined"
                name="joined_at"
                value={joinedAt}
                onChange={setJoinedAt}
                toDate={new Date()}
                placeholder="Pick the date they joined or transferred in"
                error={errors.joined_at}
            />

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-subjects`}>Subjects</Label>
                <MultiSelect
                    id={`${idPrefix}-subjects`}
                    name="subject_ids"
                    options={subjects.map((subject) => ({
                        value: subject.id,
                        label: subject.name,
                    }))}
                    value={subjectIds}
                    selectedOptions={selectedSubjects}
                    onChange={setSubjectIds}
                    placeholder="Select the subjects they teach"
                    searchPlaceholder="Search subjects..."
                    emptyText="No subjects match your search."
                    noOptionsText="No subjects yet — add one from the Subjects page first."
                />
                <InputError
                    message={errors['subject_ids.0'] ?? errors.subject_ids}
                />
            </div>

            {teacher && (
                <div className="grid gap-2">
                    <Label htmlFor={`${idPrefix}-status`}>Status</Label>
                    <Select name="status" defaultValue={teacher.status}>
                        <SelectTrigger
                            id={`${idPrefix}-status`}
                            className="w-full"
                        >
                            <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(statusLabel).map(
                                ([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.status} />
                </div>
            )}
        </>
    );
}
