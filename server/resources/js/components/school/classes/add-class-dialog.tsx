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
import classes from '@/routes/classes';

export function AddClassDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Add Class</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a class</DialogTitle>
                </DialogHeader>

                <Form
                    {...classes.store.form()}
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="add-class-name">Name</Label>
                                <Input
                                    id="add-class-name"
                                    name="name"
                                    required
                                    autoComplete="off"
                                    placeholder="e.g. JSS 1A"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Add Class
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
