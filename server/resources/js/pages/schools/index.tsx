import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
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
import schools from '@/routes/schools';

type School = {
    id: string;
    name: string;
    contact_email: string;
    status: 'invited' | 'active' | 'suspended';
    invited_at: string | null;
};

const statusVariant: Record<
    School['status'],
    'default' | 'secondary' | 'destructive'
> = {
    invited: 'secondary',
    active: 'default',
    suspended: 'destructive',
};

export default function SchoolsIndex({ schools: list }: { schools: School[] }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Head title="Schools" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Schools"
                        description="Schools invited to the platform"
                    />

                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>Invite School</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Invite a school</DialogTitle>
                            </DialogHeader>

                            <Form
                                {...schools.store.form()}
                                resetOnSuccess
                                onSuccess={() => setOpen(false)}
                                className="space-y-4"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">
                                                School name
                                            </Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                required
                                                autoComplete="off"
                                                placeholder="Lagos Model College"
                                            />
                                            <InputError message={errors.name} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="contact_email">
                                                Contact email
                                            </Label>
                                            <Input
                                                id="contact_email"
                                                type="email"
                                                name="contact_email"
                                                required
                                                autoComplete="off"
                                                placeholder="admin@school.edu.ng"
                                            />
                                            <InputError
                                                message={errors.contact_email}
                                            />
                                        </div>

                                        <DialogFooter>
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                            >
                                                Send Invitation
                                            </Button>
                                        </DialogFooter>
                                    </>
                                )}
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="border-sidebar-border/70 dark:border-sidebar-border overflow-hidden rounded-xl border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">
                                    Contact Email
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Status
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Invited
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                            {list.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="text-muted-foreground px-4 py-6 text-center"
                                    >
                                        No schools invited yet.
                                    </td>
                                </tr>
                            )}

                            {list.map((school) => (
                                <tr key={school.id}>
                                    <td className="px-4 py-3 font-medium">
                                        {school.name}
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {school.contact_email}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant={
                                                statusVariant[school.status]
                                            }
                                            className="capitalize"
                                        >
                                            {school.status}
                                        </Badge>
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {school.invited_at
                                            ? new Date(
                                                  school.invited_at,
                                              ).toLocaleDateString()
                                            : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

SchoolsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Schools',
            href: schools.index(),
        },
    ],
};
