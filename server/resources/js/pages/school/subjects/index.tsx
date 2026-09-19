import { Head, Link } from '@inertiajs/react';
import { BookOpen, CircleCheck } from 'lucide-react';
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
import { AddSubjectDialog } from '@/components/school/subjects/add-subject-dialog';
import { EditSubjectDialog } from '@/components/school/subjects/edit-subject-dialog';
import type { Subject } from '@/components/school/subjects/subject';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import {
    StatusActionItem,
    ToggleStatusDialog,
} from '@/components/toggle-status-dialog';
import { useListFilters } from '@/hooks/use-list-filters';
import subjects from '@/routes/subjects';
import type { Paginated } from '@/types/pagination';

type Stats = {
    total: number;
    active: number;
};

export default function SubjectsIndex({
    subjects: paginatedSubjects,
    filters: initialFilters,
    stats,
}: {
    subjects: Paginated<Subject>;
    filters: { search?: string; status?: string };
    stats: Stats;
}) {
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [togglingSubject, setTogglingSubject] = useState<Subject | null>(
        null,
    );
    const [filters, setFilters] = useListFilters(subjects.index().url, {
        search: initialFilters.search ?? '',
        status: initialFilters.status ?? '',
    });

    const update = (key: keyof typeof filters, value: string) =>
        setFilters((current) => ({ ...current, [key]: value }));
    const activeCount = Object.values(filters).filter(Boolean).length;
    const clearFilters = () => setFilters({ search: '', status: '' });

    return (
        <>
            <Head title="Subjects" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Subjects"
                        description="Manage your school's subjects"
                    />

                    <AddSubjectDialog />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total Subjects"
                        value={stats.total}
                        icon={BookOpen}
                    />
                    <StatCard
                        label="Active"
                        value={stats.active}
                        icon={CircleCheck}
                    />
                </div>

                <DataTableCard
                    title="All subjects"
                    icon={BookOpen}
                    count={paginatedSubjects.total}
                    noun="subject"
                    filters={
                        <FilterBar
                            activeCount={activeCount}
                            onClear={clearFilters}
                            className="lg:grid-cols-3"
                        >
                            <FilterSearch
                                id="subjects-search"
                                value={filters.search}
                                onChange={(value) => update('search', value)}
                                placeholder="Name..."
                            />
                            <FilterSelect
                                id="subjects-status"
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
                    {paginatedSubjects.data.length === 0 ? (
                        <TableEmptyState
                            icon={BookOpen}
                            title="No subjects found"
                            description={
                                activeCount > 0
                                    ? 'Nothing matches these filters. Try clearing them.'
                                    : 'Subjects you add will show up here.'
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
                                <Th>Qualified Teachers</Th>
                                <Th>Status</Th>
                                <Th align="right" stickyRight>
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </THead>
                            <TBody>
                                {paginatedSubjects.data.map((subject) => (
                                    <Tr key={subject.id}>
                                        <Td className="font-medium whitespace-nowrap">
                                            <Link
                                                href={subjects.show(subject)}
                                                className="hover:underline"
                                            >
                                                {subject.name}
                                            </Link>
                                        </Td>
                                        <Td muted className="tabular-nums">
                                            {subject.teachers_count}
                                        </Td>
                                        <Td>
                                            <StatusBadge
                                                tone={
                                                    recordStatusTone[
                                                        subject.status
                                                    ]
                                                }
                                            >
                                                {
                                                    recordStatusLabel[
                                                        subject.status
                                                    ]
                                                }
                                            </StatusBadge>
                                        </Td>
                                        <Td align="right" stickyRight>
                                            <RowActions
                                                viewHref={subjects.show(
                                                    subject,
                                                )}
                                                onEdit={() =>
                                                    setEditingSubject(subject)
                                                }
                                            >
                                                <StatusActionItem
                                                    active={
                                                        subject.status ===
                                                        'active'
                                                    }
                                                    onClick={() =>
                                                        setTogglingSubject(
                                                            subject,
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
                        links={paginatedSubjects.links}
                        from={paginatedSubjects.from}
                        to={paginatedSubjects.to}
                        total={paginatedSubjects.total}
                    />
                </DataTableCard>
            </div>

            {editingSubject && (
                <EditSubjectDialog
                    subject={editingSubject}
                    onClose={() => setEditingSubject(null)}
                />
            )}

            <ToggleStatusDialog
                record={togglingSubject}
                url={
                    togglingSubject
                        ? subjects.status.update(togglingSubject).url
                        : ''
                }
                active={togglingSubject?.status === 'active'}
                noun="subject"
                onClose={() => setTogglingSubject(null)}
            />
        </>
    );
}

SubjectsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Subjects',
            href: subjects.index(),
        },
    ],
};
