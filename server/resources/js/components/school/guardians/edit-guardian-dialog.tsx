import { Form } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import guardians from '@/routes/guardians';
import type { Guardian } from './guardian';
import { GuardianFormFields } from './guardian-form-fields';

export function EditGuardianDialog({
    guardian,
    onClose,
}: {
    guardian: Guardian;
    onClose: () => void;
}) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {guardian.name}</DialogTitle>
                </DialogHeader>

                <Form
                    {...guardians.update.form(guardian)}
                    onSuccess={onClose}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <GuardianFormFields
                                idPrefix="edit-guardian"
                                errors={errors}
                                guardian={guardian}
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
