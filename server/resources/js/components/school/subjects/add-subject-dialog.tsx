import { Form } from '@inertiajs/react';
import { useState } from 'react';
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
import subjects from '@/routes/subjects';

export function AddSubjectDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Add Subject</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a subject</DialogTitle>
                </DialogHeader>

                <Form
                    {...subjects.store.form()}
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="add-subject-name">Name</Label>
                                <Input
                                    id="add-subject-name"
                                    name="name"
                                    required
                                    autoComplete="off"
                                    placeholder="e.g. Mathematics"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Add Subject
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
