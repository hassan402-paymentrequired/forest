import { Form } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import teachers from '@/routes/teachers';
import type { SubjectOption } from './teacher';
import { TeacherFormFields } from './teacher-form-fields';

export function AddTeacherDialog({ subjects }: { subjects: SubjectOption[] }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Add Teacher</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a teacher</DialogTitle>
                </DialogHeader>

                <Form
                    {...teachers.store.form()}
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <TeacherFormFields
                                idPrefix="add-teacher"
                                subjects={subjects}
                                errors={errors}
                            />

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Add Teacher
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
