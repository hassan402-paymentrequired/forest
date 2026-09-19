import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftRight,
    Download,
    UserCheck,
    UserPlus,
    UserX,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { Pagination } from '@/components/pagination';
import { AddStudentDialog } from '@/components/school/students/add-student-dialog';
import type { SchoolClassOption } from '@/components/school/students/class-select';
import { EditStudentDialog } from '@/components/school/students/edit-student-dialog';
import { ImportStudentsDialog } from '@/components/school/students/import-students-dialog';
import {
    studentStatusAction,
    studentStatusLabel as statusLabel,
    studentStatusTone as statusTone,
} from '@/components/school/students/student';
import type { StudentStatus } from '@/components/school/students/student';
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
import { StatCard } from '@/components/stat-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    StatusActionItem,
    ToggleStatusDialog,
} from '@/components/toggle-status-dialog';
import { useListFilters } from '@/hooks/use-list-filters';
import academicSessions from '@/routes/academic-sessions';
import students from '@/routes/students';
import type { Paginated } from '@/types/pagination';

type Student = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    admission_number: string | null;
    admission_date: string | null;
    date_of_birth: string | null;
    attendance_rate: number | null;
    status: StudentStatus;
    class: SchoolClassOption | null;
};

type Stats = {
    total: number;
    active: number;
    registered_this_month: number;
    transferred: number;
};

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

function formatDate(date: string | null) {
    return date
        ? new Date(date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          })
        : '—';
}

export default function StudentsIndex({
    students: paginatedStudents,
    filters: initialFilters,
    classes,
    current_term: hasCurrentTerm,
    stats,
}: {
    students: Paginated<Student>;
    filters: { search?: string; status?: string; class_id?: string };
    classes: SchoolClassOption[];
    current_term: boolean;
    stats: Stats;
}) {
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [togglingStudent, setTogglingStudent] = useState<Student | null>(
        null,
    );
    const [filters, setFilters] = useListFilters(students.index().url, {
        search: initialFilters.search ?? '',
        status: initialFilters.status ?? '',
        class_id: initialFilters.class_id ?? '',
    });

    const update = (key: keyof typeof filters, value: string) =>
        setFilters((current) => ({ ...current, [key]: value }));
    const activeCount = Object.values(filters).filter(Boolean).length;
    const clearFilters = () =>
        setFilters({ search: '', status: '', class_id: '' });

    return (
        <>
            <Head title="Students" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Students"
                        description="Manage your school's students"
                    />

                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                            <a href={students.export().url}>
                                <Download />
                                Export
                            </a>
                        </Button>
                        <ImportStudentsDialog />
                        <AddStudentDialog
                            classes={classes}
                            hasCurrentTerm={hasCurrentTerm}
                        />
                    </div>
                </div>

                {!hasCurrentTerm && (
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border border-dashed p-4 text-sm">
                        <span className="text-muted-foreground">
                            Set a current academic term before adding or
                            enrolling students.
                        </span>{' '}
                        <Link
                            href={academicSessions.index()}
                            className="font-medium underline underline-offset-4"
                        >
                            Manage academic terms
                        </Link>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total Students"
                        value={stats.total}
                        icon={Users}
                    />
                    <StatCard
                        label="Active"
                        value={stats.active}
                        icon={UserCheck}
                    />
                    <StatCard
                        label="Registered This Month"
                        value={stats.registered_this_month}
                        icon={UserPlus}
                    />
                    <StatCard
                        label="Transferred"
                        value={stats.transferred}
                        icon={ArrowLeftRight}
                    />
                </div>

                <DataTableCard
                    title="All students"
                    icon={Users}
                    count={paginatedStudents.total}
                    noun="student"
                    filters={
                        <FilterBar
                            activeCount={activeCount}
                            onClear={clearFilters}
                        >
                            <FilterSearch
                                id="students-search"
                                value={filters.search}
                                onChange={(value) => update('search', value)}
                                placeholder="Name or admission number..."
                            />
                            <FilterSelect
                                id="students-class"
                                label="Class"
                                value={filters.class_id}
                                onChange={(value) => update('class_id', value)}
                                allLabel="All classes"
                                options={classes.map((schoolClass) => ({
                                    value: schoolClass.id,
                                    label: schoolClass.name,
                                }))}
                            />
                            <FilterSelect
                                id="students-status"
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
                    {paginatedStudents.data.length === 0 ? (
                        <TableEmptyState
                            icon={Users}
                            title="No students found"
                            description={
                                activeCount > 0
                                    ? 'Nothing matches these filters. Try clearing them.'
                                    : 'Students you add will show up here.'
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
                                <Th>Admission No.</Th>
                                <Th>Admission Date</Th>
                                <Th>Date of Birth</Th>
                                <Th>Class</Th>
                                <Th>Attendance</Th>
                                <Th>Status</Th>
                                <Th align="right" stickyRight>
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </THead>
                            <TBody>
                                {paginatedStudents.data.map((student) => (
                                    <Tr key={student.id}>
                                        <Td className="font-medium whitespace-nowrap">
                                            <Link
                                                href={students.show(student)}
                                                className="flex items-center gap-3 hover:underline"
                                            >
                                                <Avatar>
                                                    <AvatarFallback className="text-xs">
                                                        {initials(student.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {student.name}
                                            </Link>
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            {student.email ?? '—'}
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            {student.phone ?? '—'}
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            {student.admission_number ?? '—'}
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            {formatDate(student.admission_date)}
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            {formatDate(student.date_of_birth)}
                                        </Td>
                                        <Td muted className="whitespace-nowrap">
                                            {student.class?.name ??
                                                'Not enrolled'}
                                        </Td>
                                        <Td muted className="tabular-nums">
                                            {student.attendance_rate !== null
                                                ? `${student.attendance_rate}%`
                                                : '—'}
                                        </Td>
                                        <Td>
                                            <StatusBadge
                                                tone={
                                                    statusTone[student.status]
                                                }
                                            >
                                                {statusLabel[student.status]}
                                            </StatusBadge>
                                        </Td>
                                        <Td align="right" stickyRight>
                                            <RowActions
                                                viewHref={students.show(
                                                    student,
                                                )}
                                                onEdit={() =>
                                                    setEditingStudent(student)
                                                }
                                            >
                                                <StatusActionItem
                                                    active={
                                                        student.status ===
                                                        'active'
                                                    }
                                                    onClick={() =>
                                                        setTogglingStudent(
                                                            student,
                                                        )
                                                    }
                                                    deactivateLabel={
                                                        studentStatusAction.deactivateLabel
                                                    }
                                                    activateLabel={
                                                        studentStatusAction.activateLabel
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
                        links={paginatedStudents.links}
                        from={paginatedStudents.from}
                        to={paginatedStudents.to}
                        total={paginatedStudents.total}
                    />
                </DataTableCard>
            </div>

            <ToggleStatusDialog
                {...studentStatusAction}
                record={togglingStudent}
                url={
                    togglingStudent
                        ? students.status.update(togglingStudent).url
                        : ''
                }
                active={togglingStudent?.status === 'active'}
                onClose={() => setTogglingStudent(null)}
            />

            {editingStudent && (
                <EditStudentDialog
                    student={editingStudent}
                    classes={classes}
                    onClose={() => setEditingStudent(null)}
                />
            )}
        </>
    );
}

StudentsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Students',
            href: students.index(),
        },
    ],
};
