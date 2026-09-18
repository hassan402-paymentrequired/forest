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

type StudentStatus = 'active' | 'graduated' | 'transferred' | 'withdrawn';

const statusLabel: Record<StudentStatus, string> = {
    active: 'Active',
    graduated: 'Graduated',
    transferred: 'Transferred',
    withdrawn: 'Withdrawn',
};

export type EditableStudent = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    admission_number: string | null;
    admission_date: string | null;
    date_of_birth: string | null;
    status: StudentStatus;
    class: SchoolClassOption | null;
};

export function EditStudentDialog({
    student,
    classes,
    onClose,
}: {
    student: EditableStudent;
    classes: SchoolClassOption[];
    onClose: () => void;
}) {
    const [admissionDate, setAdmissionDate] = useState<Date | undefined>(
        student.admission_date ? new Date(student.admission_date) : undefined,
    );
    const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
        student.date_of_birth ? new Date(student.date_of_birth) : undefined,
    );

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit {student.name}</DialogTitle>
                </DialogHeader>

                <Form
                    {...students.update.form(student)}
                    onSuccess={onClose}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    name="name"
                                    required
                                    defaultValue={student.name}
                                    autoComplete="off"
                                    placeholder="Chidinma Okafor"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-email">Email</Label>
                                    <Input
                                        id="edit-email"
                                        type="email"
                                        name="email"
                                        defaultValue={student.email ?? ''}
                                        autoComplete="off"
                                        placeholder="chidinma@example.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-phone">Phone</Label>
                                    <Input
                                        id="edit-phone"
                                        name="phone"
                                        defaultValue={student.phone ?? ''}
                                        autoComplete="off"
                                        placeholder="0801 234 5678"
                                    />
                                    <InputError message={errors.phone} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-admission_number">
                                        Admission Number
                                    </Label>
                                    <Input
                                        id="edit-admission_number"
                                        name="admission_number"
                                        defaultValue={
                                            student.admission_number ?? ''
                                        }
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
                                    id="edit-class_id"
                                    name="class_id"
                                    defaultValue={student.class?.id}
                                />
                                <InputError message={errors.class_id} />

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-status">Status</Label>
                                    <Select
                                        name="status"
                                        defaultValue={student.status}
                                    >
                                        <SelectTrigger
                                            id="edit-status"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(statusLabel).map(
                                                ([value, label]) => (
                                                    <SelectItem
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.status} />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
