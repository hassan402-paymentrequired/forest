import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Form } from '@inertiajs/react';
import { Input } from "@/components/ui/input";
import InputError from "@/components/input-error";
import { Label } from "@/components/ui/label";
import academicSessions from "@/routes/academic-sessions";
import DateField from "@/components/date-field";


export default function AddSessionDialog() {
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
                <Button>Add Session</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add an academic session</DialogTitle>
                </DialogHeader>

                <Form
                    {...academicSessions.store.form()}
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
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    required
                                    autoComplete="off"
                                    placeholder="2025/2026"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <DateField
                                    label="Start date"
                                    name="start_date"
                                    value={startDate}
                                    onChange={setStartDate}
                                    error={errors.start_date}
                                />
                                <DateField
                                    label="End date"
                                    name="end_date"
                                    value={endDate}
                                    onChange={setEndDate}
                                    error={errors.end_date}
                                    fromDate={startDate}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Add Session
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}