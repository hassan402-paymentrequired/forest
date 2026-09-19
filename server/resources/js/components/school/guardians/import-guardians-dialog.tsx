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
import guardians from '@/routes/guardians';

export function ImportGuardiansDialog() {
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
                    <DialogTitle>Import guardians</DialogTitle>
                </DialogHeader>

                <Form
                    {...guardians.import.form()}
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="import-guardians-file">
                                    CSV file
                                </Label>
                                <Input
                                    id="import-guardians-file"
                                    name="file"
                                    type="file"
                                    accept=".csv,.txt"
                                    required
                                />
                                <p className="text-muted-foreground text-xs">
                                    Columns: Name, Email, Phone, Relationship,
                                    Primary, Children. Children lists each
                                    student as &quot;Name
                                    (AdmissionNumber)&quot;, separated by
                                    semicolons — rows where none of the
                                    admission numbers match an existing student
                                    are skipped.
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
