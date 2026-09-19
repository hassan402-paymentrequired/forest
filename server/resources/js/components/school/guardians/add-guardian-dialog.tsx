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
import guardians from '@/routes/guardians';
import { GuardianFormFields } from './guardian-form-fields';

export function AddGuardianDialog({ hasStudents }: { hasStudents: boolean }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    disabled={!hasStudents}
                    title={
                        hasStudents
                            ? undefined
                            : 'Add a student first — guardians are linked to students'
                    }
                >
                    Add Guardian
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a guardian</DialogTitle>
                </DialogHeader>

                <Form
                    {...guardians.store.form()}
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <GuardianFormFields
                                idPrefix="add-guardian"
                                errors={errors}
                            />

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Add Guardian
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
