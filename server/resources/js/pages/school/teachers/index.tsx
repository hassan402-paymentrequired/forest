import { Head, Link } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { ArrowLeftRight, Clock, UserCheck, UserX, Users } from 'lucide-react';
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
import { AddTeacherDialog } from '@/components/school/teachers/add-teacher-dialog';
import { ToggleTeacherStatusDialog } from '@/components/school/teachers/toggle-teacher-status-dialog';
import { EditTeacherDialog } from '@/components/school/teachers/edit-teacher-dialog';
import { statusLabel, statusTone } from '@/components/school/teachers/teacher';
import type {
    SubjectOption,
    Teacher,
} from '@/components/school/teachers/teacher';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useListFilters } from '@/hooks/use-list-filters';
import teachers from '@/routes/teachers';
import type { Paginated } from '@/types/pagination';

type Stats = {
    total: number;
    active: number;
    on_leave: number;
    transferred: number;
};

export default function TeachersIndex({
    teachers: paginatedTeachers,
    filters: initialFilters,
    subjects,
    stats,
}: {
    teachers: Paginated<Teacher>;
    filters: { search?: string; status?: string };
    subjects: SubjectOption[];
    stats: Stats;
}) {
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [pendingStatusChange, setPendingStatusChange] =
        useState<Teacher | null>(null);
    const [filters, setFilters] = useListFilters(teachers.index().url, {
        search: initialFilters.search ?? '',
        status: initialFilters.status ?? '',
    });

    const update = (key: keyof typeof filters, value: string) =>
        setFilters((current) => ({ ...current, [key]: value }));
    const activeCount = Object.values(filters).filter(Boolean).length;
    const clearFilters = () => setFilters({ search: '', status: '' });

    return (
        <>
            <Head title="Teachers" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Teachers"
                        description="Manage your school's teaching staff"
                    />

                    <AddTeacherDialog subjects={subjects} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total Teachers"
                        value={stats.total}
                        icon={Users}
                    />
                    <StatCard
                        label="Active"
                        value={stats.active}
                        icon={UserCheck}
                    />
                    <StatCard
                        label="On Leave"
                        value={stats.on_leave}
                        icon={Clock}
                    />
                    <StatCard
                        label="Transferred"
                        value={stats.transferred}
                        icon={ArrowLeftRight}
                    />
                </div>

                <DataTableCard
                    title="All teachers"
                    icon={Users}
                    count={paginatedTeachers.total}
                    noun="teacher"
                    filters={
                        <FilterBar
                            activeCount={activeCount}
                            onClear={clearFilters}
                            className="lg:grid-cols-3"
                        >
                            <FilterSearch
                                id="teachers-search"
                                value={filters.search}
                                onChange={(value) => update('search', value)}
                                placeholder="Name or email..."
                            />
                            <FilterSelect
                                id="teachers-status"
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
                    {paginatedTeachers.data.length === 0 ? (
                        <TableEmptyState
                            icon={Users}
                            title="No teachers found"
                            description={
                                activeCount > 0
                                    ? 'Nothing matches these filters. Try clearing them.'
                                    : 'Teachers you add will show up here.'
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
                                <Th>Subjects</Th>
                                <Th>Class teacher of</Th>
                                <Th>Joined</Th>
                                <Th>Status</Th>
                                <Th align="right" stickyRight>
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </THead>
                            <TBody>
                                {paginatedTeachers.data.map((teacher) => (
                                    <Tr key={teacher.id}>
                                        <Td className="font-medium whitespace-nowrap">
                                            <Link
                                                href={teachers.show(teacher)}
                                                className="hover:underline"
                                            >
                                                {teacher.name}
                                            </Link>
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            {teacher.email ?? '—'}
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            {teacher.phone ?? '—'}
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            <FirstAndMore
                                                items={teacher.subjects.map(
                                                    (subject) => subject.name,
                                                )}
                                            />
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            {teacher.classes
                                                .map(
                                                    (schoolClass) =>
                                                        schoolClass.name,
                                                )
                                                .join(', ') || '—'}
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            {teacher.joined_at
                                                ? format(
                                                      parseISO(
                                                          teacher.joined_at,
                                                      ),
                                                      'd MMM yyyy',
                                                  )
                                                : '—'}
                                        </Td>
                                        <Td>
                                            <StatusBadge
                                                tone={
                                                    statusTone[teacher.status]
                                                }
                                            >
                                                {statusLabel[teacher.status]}
                                            </StatusBadge>
                                        </Td>
                                        <Td align="right" stickyRight>
                                            <RowActions
                                                viewHref={teachers.show(
                                                    teacher,
                                                )}
                                                onEdit={() =>
                                                    setEditingTeacher(teacher)
                                                }
                                            >
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setPendingStatusChange(
                                                            teacher,
                                                        )
                                                    }
                                                >
                                                    {teacher.status ===
                                                    'active' ? (
                                                        <>
                                                            <UserX />
                                                            Deactivate
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserCheck />
                                                            Activate
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                            </RowActions>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </DataTable>
                    )}

                    <Pagination
                        links={paginatedTeachers.links}
                        from={paginatedTeachers.from}
                        to={paginatedTeachers.to}
                        total={paginatedTeachers.total}
                    />
                </DataTableCard>
            </div>

            <ToggleTeacherStatusDialog
                teacher={pendingStatusChange}
                onClose={() => setPendingStatusChange(null)}
            />

            {editingTeacher && (
                <EditTeacherDialog
                    teacher={editingTeacher}
                    subjects={subjects}
                    onClose={() => setEditingTeacher(null)}
                />
            )}
        </>
    );
}

TeachersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Teachers',
            href: teachers.index(),
        },
    ],
};
