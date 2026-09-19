import { parseISO } from 'date-fns';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import InputError from '@/components/input-error';
import { Session } from './academic-term';
import academicSessions from '@/routes/academic-sessions';
import { Label } from '@/components/ui/label';
import DateField from '@/components/date-field';

export function EditSessionDialog({
    session,
    onClose,
}: {
    session: Session;
    onClose: () => void;
}) {
    const [startDate, setStartDate] = useState<Date | undefined>(
        session.start_date ? parseISO(session.start_date) : undefined,
    );
    const [endDate, setEndDate] = useState<Date | undefined>(
        session.end_date ? parseISO(session.end_date) : undefined,
    );

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {session.name}</DialogTitle>
                </DialogHeader>

                <Form
                    {...academicSessions.update.form(session)}
                    onSuccess={onClose}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-session-name">Name</Label>
                                <Input
                                    id="edit-session-name"
                                    name="name"
                                    required
                                    defaultValue={session.name}
                                    autoComplete="off"
                                    placeholder="e.g. 2025/2026"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <DateField
                                    label="Start date"
                                    name="start_date"
                                    placeholder="Pick the start date"
                                    value={startDate}
                                    onChange={setStartDate}
                                    error={errors.start_date}
                                />
                                <DateField
                                    label="End date"
                                    name="end_date"
                                    placeholder="Pick the end date"
                                    value={endDate}
                                    onChange={setEndDate}
                                    error={errors.end_date}
                                    fromDate={startDate}
                                />
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
