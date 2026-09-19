import { Form } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { TeacherSearchSelect } from '@/components/school/teachers/teacher-search-select';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import classes from '@/routes/classes';

export function AssignTeacherDialog({
    classId,
    hasTeacher,
}: {
    classId: string;
    hasTeacher: boolean;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    {hasTeacher ? 'Change' : 'Assign Teacher'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign class teacher</DialogTitle>
                </DialogHeader>

                <Form
                    {...classes.teacher.store.form(classId)}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="assign-teacher">Teacher</Label>
                                <TeacherSearchSelect
                                    id="assign-teacher"
                                    placeholder="Search for an active teacher"
                                />
                                <InputError message={errors.teacher_id} />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Save
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
