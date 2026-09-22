import { Form } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import schools from '@/routes/schools';
import type { FilterOptions, Option } from '@/types/ministry';

export type SchoolProfile = {
    id: string;
    name: string;
    code: string | null;
    type: string | null;
    level: string | null;
    lga: string | null;
    education_district: string | null;
    address: string | null;
};

function ProfileSelect({
    id,
    label,
    name,
    options,
    defaultValue,
    error,
}: {
    id: string;
    label: string;
    name: string;
    options: Option[];
    defaultValue: string | null;
    error?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Select name={name} defaultValue={defaultValue ?? undefined}>
                <SelectTrigger id={id} className="w-full">
                    <SelectValue
                        placeholder={`Select ${label.toLowerCase()}`}
                    />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <InputError message={error} />
        </div>
    );
}

/** Edit a school's code, type, level and location. */
export function SchoolProfileDialog({
    school,
    options,
    open,
    onOpenChange,
}: {
    school: SchoolProfile;
    options: FilterOptions;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Edit school</DialogTitle>
                    <DialogDescription>
                        The ministry&apos;s record of the school: where it is
                        and what kind of school it is.
                    </DialogDescription>
                </DialogHeader>

                <Form
                    {...schools.update.form(school.id)}
                    onSuccess={() => onOpenChange(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="school-name">Name</Label>
                                    <Input
                                        id="school-name"
                                        name="name"
                                        required
                                        defaultValue={school.name}
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="school-code">
                                        School code
                                    </Label>
                                    <Input
                                        id="school-code"
                                        name="code"
                                        defaultValue={school.code ?? ''}
                                        placeholder="LG-0001"
                                    />
                                    <InputError message={errors.code} />
                                </div>
                                <ProfileSelect
                                    id="school-level"
                                    label="Level"
                                    name="level"
                                    options={options.levels}
                                    defaultValue={school.level}
                                    error={errors.level}
                                />
                                <ProfileSelect
                                    id="school-lga"
                                    label="LGA"
                                    name="lga"
                                    options={options.lgas}
                                    defaultValue={school.lga}
                                    error={errors.lga}
                                />
                                <ProfileSelect
                                    id="school-district"
                                    label="Education district"
                                    name="education_district"
                                    options={options.districts}
                                    defaultValue={school.education_district}
                                    error={errors.education_district}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="school-address">Address</Label>
                                <Input
                                    id="school-address"
                                    name="address"
                                    defaultValue={school.address ?? ''}
                                />
                                <InputError message={errors.address} />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Save changes
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
