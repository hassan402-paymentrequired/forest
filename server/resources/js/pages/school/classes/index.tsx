import { Head, Link } from '@inertiajs/react';
import { CircleCheck, School, Users } from 'lucide-react';
import { useState } from 'react';
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
import {
    recordStatusLabel,
    recordStatusTone,
} from '@/components/record-status';
import { AddClassDialog } from '@/components/school/classes/add-class-dialog';
import { EditClassDialog } from '@/components/school/classes/edit-class-dialog';
import type { SchoolClass } from '@/components/school/classes/school-class';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import {
    StatusActionItem,
    ToggleStatusDialog,
} from '@/components/toggle-status-dialog';
import { useListFilters } from '@/hooks/use-list-filters';
import classes from '@/routes/classes';
import type { Paginated } from '@/types/pagination';

type Stats = {
    total: number;
    active: number;
};

export default function ClassesIndex({
    classes: paginatedClasses,
    filters: initialFilters,
    stats,
}: {
    classes: Paginated<SchoolClass>;
    filters: { search?: string; status?: string };
    stats: Stats;
}) {
    const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
    const [togglingClass, setTogglingClass] = useState<SchoolClass | null>(
        null,
    );
    const [filters, setFilters] = useListFilters(classes.index().url, {
        search: initialFilters.search ?? '',
        status: initialFilters.status ?? '',
    });

    const update = (key: keyof typeof filters, value: string) =>
        setFilters((current) => ({ ...current, [key]: value }));
    const activeCount = Object.values(filters).filter(Boolean).length;
    const clearFilters = () => setFilters({ search: '', status: '' });

    return (
        <>
            <Head title="Classes" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Classes"
                        description="Manage your school's classes"
                    />

                    <AddClassDialog />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total Classes"
                        value={stats.total}
                        icon={Users}
                    />
                    <StatCard
                        label="Active"
                        value={stats.active}
                        icon={CircleCheck}
                    />
                </div>

                <DataTableCard
                    title="All classes"
                    icon={School}
                    count={paginatedClasses.total}
                    noun="class"
                    filters={
                        <FilterBar
                            activeCount={activeCount}
                            onClear={clearFilters}
                            className="lg:grid-cols-3"
                        >
                            <FilterSearch
                                id="classes-search"
                                value={filters.search}
                                onChange={(value) => update('search', value)}
                                placeholder="Name..."
                            />
                            <FilterSelect
                                id="classes-status"
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
                    {paginatedClasses.data.length === 0 ? (
                        <TableEmptyState
                            icon={School}
                            title="No classes found"
                            description={
                                activeCount > 0
                                    ? 'Nothing matches these filters. Try clearing them.'
                                    : 'Classes you add will show up here.'
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
                                <Th>Class Teacher</Th>
                                <Th>Students</Th>
                                <Th>Status</Th>
                                <Th align="right" stickyRight>
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </THead>
                            <TBody>
                                {paginatedClasses.data.map((schoolClass) => (
                                    <Tr key={schoolClass.id}>
                                        <Td className="font-medium whitespace-nowrap">
                                            <Link
                                                href={classes.show(schoolClass)}
                                                className="hover:underline"
                                            >
                                                {schoolClass.name}
                                            </Link>
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            {schoolClass.teacher?.name ?? '—'}
                                        </Td>
                                        <Td muted className="tabular-nums">
                                            {schoolClass.students_count}
                                        </Td>
                                        <Td>
                                            <StatusBadge
                                                tone={
                                                    recordStatusTone[
                                                        schoolClass.status
                                                    ]
                                                }
                                            >
                                                {
                                                    recordStatusLabel[
                                                        schoolClass.status
                                                    ]
                                                }
                                            </StatusBadge>
                                        </Td>
                                        <Td align="right" stickyRight>
                                            <RowActions
                                                viewHref={classes.show(
                                                    schoolClass,
                                                )}
                                                onEdit={() =>
                                                    setEditingClass(schoolClass)
                                                }
                                            >
                                                <StatusActionItem
                                                    active={
                                                        schoolClass.status ===
                                                        'active'
                                                    }
                                                    onClick={() =>
                                                        setTogglingClass(
                                                            schoolClass,
                                                        )
                                                    }
                                                />
                                            </RowActions>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </DataTable>
                    )}

                    <Pagination
                        links={paginatedClasses.links}
                        from={paginatedClasses.from}
                        to={paginatedClasses.to}
                        total={paginatedClasses.total}
                    />
                </DataTableCard>
            </div>

            {editingClass && (
                <EditClassDialog
                    schoolClass={editingClass}
                    onClose={() => setEditingClass(null)}
                />
            )}

            <ToggleStatusDialog
                record={togglingClass}
                url={
                    togglingClass
                        ? classes.status.update(togglingClass).url
                        : ''
                }
                active={togglingClass?.status === 'active'}
                noun="class"
                onClose={() => setTogglingClass(null)}
            />
        </>
    );
}

ClassesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Classes',
            href: classes.index(),
        },
    ],
};
