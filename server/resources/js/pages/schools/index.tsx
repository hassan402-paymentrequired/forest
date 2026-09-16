import { Form, Head } from '@inertiajs/react';
import {
    CheckCircle2,
    MailWarning,
    School as SchoolIcon,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
import { StatCard } from '@/components/stat-card';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useListFilters } from '@/hooks/use-list-filters';
import schools from '@/routes/schools';
import type { Paginated } from '@/types/pagination';

type School = {
    id: string;
    name: string;
    contact_email: string;
    status: 'invited' | 'active' | 'suspended';
    invited_at: string | null;
};

type Stats = {
    total: number;
    invited: number;
    active: number;
    suspended: number;
};

const statusLabel = {
    invited: 'Invited',
    active: 'Active',
    suspended: 'Suspended',
} as const;

const statusVariant: Record<
    School['status'],
    'default' | 'secondary' | 'destructive'
> = {
    invited: 'secondary',
    active: 'default',
    suspended: 'destructive',
};

export default function SchoolsIndex({
    schools: paginatedSchools,
    filters: initialFilters,
    stats,
}: {
    schools: Paginated<School>;
    filters: { search?: string; status?: string };
    stats: Stats;
}) {
    const [open, setOpen] = useState(false);
    const [filters, setFilters] = useListFilters(schools.index().url, {
        search: initialFilters.search ?? '',
        status: initialFilters.status ?? '',
    });

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

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total Schools"
                        value={stats.total}
                        icon={SchoolIcon}
                    />
                    <StatCard
                        label="Invited"
                        value={stats.invited}
                        icon={MailWarning}
                    />
                    <StatCard
                        label="Active"
                        value={stats.active}
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="Suspended"
                        value={stats.suspended}
                        icon={XCircle}
                    />
                </div>

                <div className="border-sidebar-border/70 dark:border-sidebar-border overflow-hidden rounded-xl border">
                    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
                        <Input
                            value={filters.search}
                            onChange={(event) =>
                                setFilters((current) => ({
                                    ...current,
                                    search: event.target.value,
                                }))
                            }
                            placeholder="Search by name or email..."
                            className="sm:max-w-xs"
                        />
                        <Select
                            value={filters.status || 'all'}
                            onValueChange={(value) =>
                                setFilters((current) => ({
                                    ...current,
                                    status: value === 'all' ? '' : value,
                                }))
                            }
                        >
                            <SelectTrigger className="sm:w-48">
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All statuses
                                </SelectItem>
                                {Object.entries(statusLabel).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                    </div>

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
                            {paginatedSchools.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="text-muted-foreground px-4 py-6 text-center"
                                    >
                                        No schools found.
                                    </td>
                                </tr>
                            )}

                            {paginatedSchools.data.map((school) => (
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

                    <Pagination
                        links={paginatedSchools.links}
                        from={paginatedSchools.from}
                        to={paginatedSchools.to}
                        total={paginatedSchools.total}
                    />
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
