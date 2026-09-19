import { Head } from '@inertiajs/react';
import { Download, Star, UserCheck, UserX, Users } from 'lucide-react';
import { useState } from 'react';
import { FirstAndMore } from '@/components/common/first-and-more';
import Heading from '@/components/heading';
import { Pagination } from '@/components/pagination';
import {
    DataTable,
    DataTableCard,
    FilterBar,
    FilterSearch,
    FilterSelect,
    RowActions,
    StatusBadge,
    TBody,
    TableEmptyState,
    THead,
    Td,
    Th,
    Tr,
} from '@/components/data-table';
import { AddGuardianDialog } from '@/components/school/guardians/add-guardian-dialog';
import { EditGuardianDialog } from '@/components/school/guardians/edit-guardian-dialog';
import {
    initials,
    relationshipLabel,
} from '@/components/school/guardians/guardian';
import type { Guardian } from '@/components/school/guardians/guardian';
import { GuardianDetailsDialog } from '@/components/school/guardians/guardian-details-dialog';
import { ImportGuardiansDialog } from '@/components/school/guardians/import-guardians-dialog';
import {
    recordStatusLabel,
    recordStatusTone,
} from '@/components/record-status';
import { StatCard } from '@/components/stat-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    StatusActionItem,
    ToggleStatusDialog,
} from '@/components/toggle-status-dialog';
import { useListFilters } from '@/hooks/use-list-filters';
import guardians from '@/routes/guardians';
import type { Paginated } from '@/types/pagination';

type Stats = {
    total: number;
    active: number;
    primary_contacts: number;
};

export default function GuardiansIndex({
    guardians: paginatedGuardians,
    filters: initialFilters,
    has_students: hasStudents,
    stats,
}: {
    guardians: Paginated<Guardian>;
    filters: { search?: string; status?: string };
    has_students: boolean;
    stats: Stats;
}) {
    const [viewingGuardian, setViewingGuardian] = useState<Guardian | null>(
        null,
    );
    const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(
        null,
    );
    const [togglingGuardian, setTogglingGuardian] = useState<Guardian | null>(
        null,
    );
    const [filters, setFilters] = useListFilters(guardians.index().url, {
        search: initialFilters.search ?? '',
        status: initialFilters.status ?? '',
    });

    const update = (key: keyof typeof filters, value: string) =>
        setFilters((current) => ({ ...current, [key]: value }));
    const activeCount = Object.values(filters).filter(Boolean).length;
    const clearFilters = () => setFilters({ search: '', status: '' });

    return (
        <>
            <Head title="Guardians" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Guardians"
                        description="Manage your students' parents and guardians"
                    />

                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                            <a href={guardians.export().url}>
                                <Download />
                                Export
                            </a>
                        </Button>
                        <ImportGuardiansDialog />
                        <AddGuardianDialog hasStudents={hasStudents} />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard
                        label="Total Guardians"
                        value={stats.total}
                        icon={Users}
                    />
                    <StatCard
                        label="Active"
                        value={stats.active}
                        icon={UserCheck}
                    />
                    <StatCard
                        label="Primary Contacts"
                        value={stats.primary_contacts}
                        icon={Star}
                    />
                </div>

                <DataTableCard
                    title="All guardians"
                    icon={Users}
                    count={paginatedGuardians.total}
                    noun="guardian"
                    filters={
                        <FilterBar
                            activeCount={activeCount}
                            onClear={clearFilters}
                            className="lg:grid-cols-3"
                        >
                            <FilterSearch
                                id="guardians-search"
                                value={filters.search}
                                onChange={(value) => update('search', value)}
                                placeholder="Name, email or phone..."
                            />
                            <FilterSelect
                                id="guardians-status"
                                label="Status"
                                value={filters.status}
                                onChange={(value) => update('status', value)}
                                allLabel="All statuses"
                                options={Object.entries(recordStatusLabel).map(
                                    ([value, label]) => ({ value, label }),
                                )}
                            />
                        </FilterBar>
                    }
                >
                    {paginatedGuardians.data.length === 0 ? (
                        <TableEmptyState
                            icon={Users}
                            title="No guardians found"
                            description={
                                activeCount > 0
                                    ? 'Nothing matches these filters. Try clearing them.'
                                    : 'Guardians you add will show up here.'
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
                        <DataTable className="min-w-max">
                            <THead>
                                <Th>Name</Th>
                                <Th>Email</Th>
                                <Th>Phone</Th>
                                <Th>Relationship</Th>
                                <Th>Children</Th>
                                <Th>Status</Th>
                                <Th align="right" stickyRight>
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </THead>
                            <TBody>
                                {paginatedGuardians.data.map((guardian) => (
                                    <Tr key={guardian.id}>
                                        <Td className="font-medium whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setViewingGuardian(guardian)
                                                }
                                                className="flex items-center gap-3 text-left hover:underline"
                                            >
                                                <Avatar>
                                                    <AvatarFallback className="text-xs">
                                                        {initials(
                                                            guardian.name,
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {guardian.name}
                                            </button>
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            {guardian.email ?? '—'}
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            {guardian.phone ?? '—'}
                                        </Td>
                                        <Td className="whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {guardian.relationship && (
                                                    <StatusBadge tone="neutral">
                                                        {
                                                            relationshipLabel[
                                                                guardian
                                                                    .relationship
                                                            ]
                                                        }
                                                    </StatusBadge>
                                                )}
                                                {guardian.is_primary && (
                                                    <StatusBadge tone="success">
                                                        Primary
                                                    </StatusBadge>
                                                )}
                                            </div>
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            <FirstAndMore
                                                items={guardian.students.map(
                                                    (student) => student.name,
                                                )}
                                            />
                                        </Td>
                                        <Td>
                                            <StatusBadge
                                                tone={
                                                    recordStatusTone[
                                                        guardian.status
                                                    ]
                                                }
                                            >
                                                {
                                                    recordStatusLabel[
                                                        guardian.status
                                                    ]
                                                }
                                            </StatusBadge>
                                        </Td>
                                        <Td align="right" stickyRight>
                                            <RowActions
                                                onView={() =>
                                                    setViewingGuardian(guardian)
                                                }
                                                onEdit={() =>
                                                    setEditingGuardian(guardian)
                                                }
                                            >
                                                <StatusActionItem
                                                    active={
                                                        guardian.status ===
                                                        'active'
                                                    }
                                                    onClick={() =>
                                                        setTogglingGuardian(
                                                            guardian,
                                                        )
                                                    }
                                                    deactivateIcon={<UserX />}
                                                    activateIcon={<UserCheck />}
                                                />
                                            </RowActions>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </DataTable>
                    )}

                    <Pagination
                        links={paginatedGuardians.links}
                        from={paginatedGuardians.from}
                        to={paginatedGuardians.to}
                        total={paginatedGuardians.total}
                    />
                </DataTableCard>
            </div>

            {viewingGuardian && (
                <GuardianDetailsDialog
                    guardian={viewingGuardian}
                    onClose={() => setViewingGuardian(null)}
                    onEdit={() => {
                        setEditingGuardian(viewingGuardian);
                        setViewingGuardian(null);
                    }}
                />
            )}

            <ToggleStatusDialog
                record={togglingGuardian}
                url={
                    togglingGuardian
                        ? guardians.status.update(togglingGuardian).url
                        : ''
                }
                active={togglingGuardian?.status === 'active'}
                noun="guardian"
                onClose={() => setTogglingGuardian(null)}
            />

            {editingGuardian && (
                <EditGuardianDialog
                    guardian={editingGuardian}
                    onClose={() => setEditingGuardian(null)}
                />
            )}
        </>
    );
}

GuardiansIndex.layout = {
    breadcrumbs: [
        {
            title: 'Guardians',
            href: guardians.index(),
        },
    ],
};
