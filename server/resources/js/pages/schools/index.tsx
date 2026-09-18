import { Form, Head, Link } from '@inertiajs/react';
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
import {
    DataTable,
    DataTableCard,
    FilterBar,
    FilterSearch,
    FilterSelect,
    StatusBadge,
    TBody,
    TableEmptyState,
    THead,
    Td,
    Th,
    Tr,
    type Tone,
} from '@/components/data-table';
import { StatCard } from '@/components/stat-card';
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
import { useListFilters } from '@/hooks/use-list-filters';
import schools from '@/routes/schools';
import type { Paginated } from '@/types/pagination';

type School = {
    id: string;
    name: string;
    contact_email: string;
    status: 'invited' | 'active' | 'suspended';
    invited_at: string | null;
    activated_at: string | null;
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

const statusTone: Record<School['status'], Tone> = {
    invited: 'info',
    active: 'success',
    suspended: 'danger',
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

    const update = (key: keyof typeof filters, value: string) =>
        setFilters((current) => ({ ...current, [key]: value }));
    const activeCount = Object.values(filters).filter(Boolean).length;
    const clearFilters = () => setFilters({ search: '', status: '' });

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

                <DataTableCard
                    title="All schools"
                    icon={SchoolIcon}
                    count={paginatedSchools.total}
                    noun="school"
                    filters={
                        <FilterBar
                            activeCount={activeCount}
                            onClear={clearFilters}
                            className="lg:grid-cols-3"
                        >
                            <FilterSearch
                                id="schools-search"
                                value={filters.search}
                                onChange={(value) => update('search', value)}
                                placeholder="Name or email..."
                            />
                            <FilterSelect
                                id="schools-status"
                                label="Status"
                                value={filters.status}
                                onChange={(value) => update('status', value)}
                                allLabel="All statuses"
                                options={Object.entries(statusLabel).map(
                                    ([value, label]) => ({ value, label }),
                                )}
                            />
                        </FilterBar>
                    }
                >
                    {paginatedSchools.data.length === 0 ? (
                        <TableEmptyState
                            icon={SchoolIcon}
                            title="No schools found"
                            description={
                                activeCount > 0
                                    ? 'Nothing matches these filters. Try clearing them.'
                                    : 'Schools you invite will show up here.'
                            }
                            action={
                                activeCount > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={clearFilters}
                                    >
                                        Clear filters
                                    </Button>
                                )
                            }
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>Name</Th>
                                <Th hideOnMobile>Contact Email</Th>
                                <Th>Status</Th>
                                <Th hideOnMobile>Invited</Th>
                                <Th hideOnMobile>Activated</Th>
                            </THead>
                            <TBody>
                                {paginatedSchools.data.map((school) => (
                                    <Tr key={school.id}>
                                        <Td className="font-medium">
                                            <Link
                                                href={schools.show(school)}
                                                className="hover:underline"
                                            >
                                                {school.name}
                                            </Link>
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {school.contact_email}
                                        </Td>
                                        <Td>
                                            <StatusBadge
                                                tone={statusTone[school.status]}
                                            >
                                                {statusLabel[school.status]}
                                            </StatusBadge>
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {school.invited_at
                                                ? new Date(
                                                      school.invited_at,
                                                  ).toLocaleDateString()
                                                : '—'}
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {school.activated_at
                                                ? new Date(
                                                      school.activated_at,
                                                  ).toLocaleDateString()
                                                : '—'}
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </DataTable>
                    )}

                    <Pagination
                        links={paginatedSchools.links}
                        from={paginatedSchools.from}
                        to={paginatedSchools.to}
                        total={paginatedSchools.total}
                    />
                </DataTableCard>
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
