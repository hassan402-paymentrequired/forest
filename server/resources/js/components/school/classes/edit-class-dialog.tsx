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
import classes from '@/routes/classes';
import type { SchoolClass } from './school-class';

export function EditClassDialog({
    schoolClass,
    onClose,
}: {
    schoolClass: Pick<SchoolClass, 'id' | 'name'>;
    onClose: () => void;
}) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {schoolClass.name}</DialogTitle>
                </DialogHeader>

                <Form
                    {...classes.update.form(schoolClass)}
                    onSuccess={onClose}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-class-name">Name</Label>
                                <Input
                                    id="edit-class-name"
                                    name="name"
                                    required
                                    defaultValue={schoolClass.name}
                                    autoComplete="off"
                                    placeholder="e.g. JSS 1A"
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
