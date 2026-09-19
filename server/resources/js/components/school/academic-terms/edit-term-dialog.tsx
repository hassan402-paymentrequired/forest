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
import { Term, termLabel } from './academic-term';
import academicTerms from '@/routes/academic-terms';
import TermNameSelect from './term-name-select';
import InputError from '@/components/input-error';
import DateField from '@/components/date-field';

export function EditTermDialog({
    term,
    onClose,
}: {
    term: Term;
    onClose: () => void;
}) {
    const [startDate, setStartDate] = useState<Date | undefined>(
        term.start_date ? parseISO(term.start_date) : undefined,
    );
    const [endDate, setEndDate] = useState<Date | undefined>(
        term.end_date ? parseISO(term.end_date) : undefined,
    );

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {termLabel[term.name]}</DialogTitle>
                </DialogHeader>

                <Form
                    {...academicTerms.update.form(term)}
                    onSuccess={onClose}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <TermNameSelect
                                id="edit-term-name"
                                defaultValue={term.name}
                            />
                            <InputError message={errors.name} />

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
