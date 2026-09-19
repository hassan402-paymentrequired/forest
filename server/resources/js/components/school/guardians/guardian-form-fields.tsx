import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    StudentMultiSelect,
    studentOption,
} from '@/components/school/students/student-multi-select';
import { relationshipLabel } from './guardian';
import type { Guardian } from './guardian';

/**
 * The fields shared by the add and edit guardian dialogs. Pass `guardian` to
 * prefill.
 */
export function GuardianFormFields({
    idPrefix,
    errors,
    guardian,
}: {
    idPrefix: string;
    errors: Partial<Record<string, string>>;
    guardian?: Guardian;
}) {
    return (
        <>
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-name`}>Name</Label>
                <Input
                    id={`${idPrefix}-name`}
                    name="name"
                    required
                    defaultValue={guardian?.name}
                    autoComplete="off"
                    placeholder="e.g. Jane Okafor"
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
                        defaultValue={guardian?.email ?? ''}
                        autoComplete="off"
                        placeholder="e.g. jane@example.com"
                    />
                    <InputError message={errors.email} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
                    <Input
                        id={`${idPrefix}-phone`}
                        name="phone"
                        defaultValue={guardian?.phone ?? ''}
                        autoComplete="off"
                        placeholder="e.g. 0802 345 6789"
                    />
                    <InputError message={errors.phone} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-relationship`}>Relationship</Label>
                <Select
                    name="relationship"
                    defaultValue={guardian?.relationship ?? undefined}
                >
                    <SelectTrigger
                        id={`${idPrefix}-relationship`}
                        className="w-full"
                    >
                        <SelectValue placeholder="Select their relationship to the children" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(relationshipLabel).map(
                            ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ),
                        )}
                    </SelectContent>
                </Select>
                <InputError message={errors.relationship} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-children`}>Children</Label>
                <StudentMultiSelect
                    id={`${idPrefix}-children`}
                    initialSelected={guardian?.students.map(studentOption)}
                />
                <InputError
                    message={errors['student_ids.0'] ?? errors.student_ids}
                />
            </div>

            <div className="flex items-center gap-2">
                <Checkbox
                    id={`${idPrefix}-is-primary`}
                    name="is_primary"
                    value="1"
                    defaultChecked={guardian?.is_primary}
                />
                <Label
                    htmlFor={`${idPrefix}-is-primary`}
                    className="font-normal"
                >
                    Primary contact for these children
                </Label>
            </div>
        </>
    );
}
