import { Form } from '@inertiajs/react';
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
import subjects from '@/routes/subjects';
import type { Subject } from './subject';

export function EditSubjectDialog({
    subject,
    onClose,
}: {
    subject: Pick<Subject, 'id' | 'name'>;
    onClose: () => void;
}) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {subject.name}</DialogTitle>
                </DialogHeader>

                <Form
                    {...subjects.update.form(subject)}
                    onSuccess={onClose}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-subject-name">Name</Label>
                                <Input
                                    id="edit-subject-name"
                                    name="name"
                                    required
                                    defaultValue={subject.name}
                                    autoComplete="off"
                                    placeholder="e.g. Mathematics"
                                />
                                <InputError message={errors.name} />
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
