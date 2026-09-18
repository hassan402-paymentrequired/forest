import { Form } from '@inertiajs/react';
import { useState } from 'react';
import DateField from '@/components/date-field';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import students from '@/routes/students';
import { ClassSelect, type SchoolClassOption } from './class-select';

type GuardianRelationship = 'father' | 'mother' | 'guardian' | 'other';

const guardianRelationshipLabel: Record<GuardianRelationship, string> = {
    father: 'Father',
    mother: 'Mother',
    guardian: 'Guardian',
    other: 'Other',
};

export function AddStudentDialog({
    classes,
    hasCurrentTerm,
}: {
    classes: SchoolClassOption[];
    hasCurrentTerm: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [admissionDate, setAdmissionDate] = useState<Date | undefined>(
        new Date(),
    );
    const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={classes.length === 0 || !hasCurrentTerm}>
                    Add Student
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add a student</DialogTitle>
                </DialogHeader>

                <Form
                    {...students.store.form()}
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    required
                                    autoComplete="off"
                                    placeholder="Chidinma Okafor"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        autoComplete="off"
                                        placeholder="chidinma@example.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        autoComplete="off"
                                        placeholder="0801 234 5678"
                                    />
                                    <InputError message={errors.phone} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="admission_number">
                                        Admission Number
                                    </Label>
                                    <Input
                                        id="admission_number"
                                        name="admission_number"
                                        autoComplete="off"
                                        placeholder="ADM-0001"
                                    />
                                    <InputError
                                        message={errors.admission_number}
                                    />
                                </div>

                                <DateField
                                    label="Admission Date"
                                    name="admission_date"
                                    value={admissionDate}
                                    onChange={setAdmissionDate}
                                    error={errors.admission_date}
                                />

                                <DateField
                                    label="Date of Birth"
                                    name="date_of_birth"
                                    value={dateOfBirth}
                                    onChange={setDateOfBirth}
                                    error={errors.date_of_birth}
                                />

                                <ClassSelect
                                    classes={classes}
                                    id="class_id"
                                    name="class_id"
                                />
                                <InputError message={errors.class_id} />
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                <div>
                                    <h3 className="text-sm font-semibold">
                                        Guardian
                                    </h3>
                                    <p className="text-muted-foreground text-xs">
                                        Optional — link a guardian now, or add
                                        one later from the Guardians page.
                                    </p>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="guardian_name">
                                            Guardian Name
                                        </Label>
                                        <Input
                                            id="guardian_name"
                                            name="guardian_name"
                                            autoComplete="off"
                                            placeholder="Jane Okafor"
                                        />
                                        <InputError
                                            message={errors.guardian_name}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="guardian_relationship">
                                            Relationship
                                        </Label>
                                        <Select name="guardian_relationship">
                                            <SelectTrigger
                                                id="guardian_relationship"
                                                className="w-full"
                                            >
                                                <SelectValue placeholder="Select a relationship" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(
                                                    guardianRelationshipLabel,
                                                ).map(([value, label]) => (
                                                    <SelectItem
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            message={
                                                errors.guardian_relationship
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="guardian_email">
                                            Guardian Email
                                        </Label>
                                        <Input
                                            id="guardian_email"
                                            type="email"
                                            name="guardian_email"
                                            autoComplete="off"
                                            placeholder="jane@example.com"
                                        />
                                        <InputError
                                            message={errors.guardian_email}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="guardian_phone">
                                            Guardian Phone
                                        </Label>
                                        <Input
                                            id="guardian_phone"
                                            name="guardian_phone"
                                            autoComplete="off"
                                            placeholder="0802 345 6789"
                                        />
                                        <InputError
                                            message={errors.guardian_phone}
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Add Student
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
