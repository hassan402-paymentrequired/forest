import { Form } from '@inertiajs/react';
import { Upload } from 'lucide-react';
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
import students from '@/routes/students';

export function ImportStudentsDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload />
                    Import
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import students</DialogTitle>
                </DialogHeader>

                <Form
                    {...students.import.form()}
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="file">CSV file</Label>
                                <Input
                                    id="file"
                                    name="file"
                                    type="file"
                                    accept=".csv,.txt"
                                    required
                                />
                                <p className="text-muted-foreground text-xs">
                                    Columns: Name, Email, Phone, Admission
                                    Number, Admission Date, Class, Status. Rows
                                    with a class that doesn&apos;t match one of
                                    your existing classes are skipped.
                                </p>
                                <InputError message={errors.file} />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Import
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
