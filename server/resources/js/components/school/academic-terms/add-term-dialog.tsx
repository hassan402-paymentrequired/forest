import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@inertiajs/react';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import academicTerms from '@/routes/academic-terms';
import TermNameSelect from './term-name-select';
import InputError from '@/components/input-error';
import { Session } from './academic-term';
import DateField from '@/components/date-field';

export function AddTermDialog({ session }: { session: Session }) {
    const [open, setOpen] = useState(false);
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                    setStartDate(undefined);
                    setEndDate(undefined);
                }
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Plus />
                    Add Term
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a term to {session.name}</DialogTitle>
                </DialogHeader>

                <Form
                    {...academicTerms.store.form(session)}
                    resetOnSuccess
                    onSuccess={() => {
                        setOpen(false);
                        setStartDate(undefined);
                        setEndDate(undefined);
                    }}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <TermNameSelect id="term-name" />
                            <InputError message={errors.name} />

                            <div className="grid grid-cols-2 gap-4">
                                <DateField
                                    label="Start date"
                                    name="start_date"
                                    placeholder="Pick the term start date"
                                    value={startDate}
                                    onChange={setStartDate}
                                    error={errors.start_date}
                                />
                                <DateField
                                    label="End date"
                                    name="end_date"
                                    placeholder="Pick the term end date"
                                    value={endDate}
                                    onChange={setEndDate}
                                    error={errors.end_date}
                                    fromDate={startDate}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Add Term
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
