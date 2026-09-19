import { Form } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import teachers from '@/routes/teachers';
import type { SubjectOption, Teacher } from './teacher';
import { TeacherFormFields } from './teacher-form-fields';

export function EditTeacherDialog({
    teacher,
    subjects,
    onClose,
}: {
    teacher: Teacher;
    subjects: SubjectOption[];
    onClose: () => void;
}) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {teacher.name}</DialogTitle>
                </DialogHeader>

                <Form
                    {...teachers.update.form(teacher)}
                    onSuccess={onClose}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <TeacherFormFields
                                idPrefix="edit-teacher"
                                subjects={subjects}
                                errors={errors}
                                teacher={teacher}
                            />

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
