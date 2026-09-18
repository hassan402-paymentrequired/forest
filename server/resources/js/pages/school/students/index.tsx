import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeftRight,
    Download,
    Eye,
    MoreHorizontal,
    Pencil,
    Search,
    Trash2,
    UserCheck,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { Pagination } from '@/components/pagination';
import { AddStudentDialog } from '@/components/school/students/add-student-dialog';
import type { SchoolClassOption } from '@/components/school/students/class-select';
import { EditStudentDialog } from '@/components/school/students/edit-student-dialog';
import { ImportStudentsDialog } from '@/components/school/students/import-students-dialog';
import { StatCard } from '@/components/stat-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useListFilters } from '@/hooks/use-list-filters';
import academicSessions from '@/routes/academic-sessions';
import students from '@/routes/students';
import type { Paginated } from '@/types/pagination';

type StudentStatus = 'active' | 'graduated' | 'transferred' | 'withdrawn';

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

const statusLabel: Record<StudentStatus, string> = {
    active: 'Active',
    graduated: 'Graduated',
    transferred: 'Transferred',
    withdrawn: 'Withdrawn',
};

const statusVariant: Record<
    StudentStatus,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    active: 'default',
    graduated: 'secondary',
    transferred: 'outline',
    withdrawn: 'destructive',
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
    const [filters, setFilters] = useListFilters(students.index().url, {
        search: initialFilters.search ?? '',
        status: initialFilters.status ?? '',
        class_id: initialFilters.class_id ?? '',
    });

    const handleDelete = (student: Student) => {
        if (confirm(`Remove ${student.name} from the student directory?`)) {
            router.delete(students.destroy(student).url);
        }
    };

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

                <div className="border-sidebar-border/70 dark:border-sidebar-border overflow-hidden rounded-xl border">
                    <div className="flex items-center justify-between px-6">
                        <div className="text-lg font-semibold">
                            All Students
                        </div>
                        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
                            <div className="relative sm:max-w-xs">
                                <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    value={filters.search}
                                    onChange={(event) =>
                                        setFilters((current) => ({
                                            ...current,
                                            search: event.target.value,
                                        }))
                                    }
                                    placeholder="Search by name or admission number..."
                                    className="pl-8 sm:max-w-xs"
                                />
                            </div>
                            <Select
                                value={filters.class_id || 'all'}
                                onValueChange={(value) =>
                                    setFilters((current) => ({
                                        ...current,
                                        class_id: value === 'all' ? '' : value,
                                    }))
                                }
                            >
                                <SelectTrigger className="sm:w-48">
                                    <SelectValue placeholder="All classes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All classes
                                    </SelectItem>
                                    {classes.map((schoolClass) => (
                                        <SelectItem
                                            key={schoolClass.id}
                                            value={schoolClass.id}
                                        >
                                            {schoolClass.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                            <SelectItem
                                                key={value}
                                                value={value}
                                            >
                                                {label}
                                            </SelectItem>
                                        ),
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">
                                    Contact
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Admission No.
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Admission Date
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Date of Birth
                                </th>
                                <th className="px-4 py-3 font-medium">Class</th>
                                <th className="px-4 py-3 font-medium">
                                    Attendance
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Status
                                </th>
                                <th className="px-4 py-3 font-medium" />
                            </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                            {paginatedStudents.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="text-muted-foreground px-4 py-6 text-center"
                                    >
                                        No students found.
                                    </td>
                                </tr>
                            )}

                            {paginatedStudents.data.map((student) => (
                                <tr key={student.id}>
                                    <td className="px-4 py-3 font-medium">
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
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {student.email}
                                        {student.email && student.phone
                                            ? ' · '
                                            : ''}
                                        {student.phone}
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {student.admission_number ?? '—'}
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {formatDate(student.admission_date)}
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {formatDate(student.date_of_birth)}
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {student.class?.name ?? 'Not enrolled'}
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {student.attendance_rate !== null
                                            ? `${student.attendance_rate}%`
                                            : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant={
                                                statusVariant[student.status]
                                            }
                                        >
                                            {statusLabel[student.status]}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8"
                                                >
                                                    <MoreHorizontal className="size-4" />
                                                    <span className="sr-only">
                                                        Open menu
                                                    </span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link
                                                        href={students.show(
                                                            student,
                                                        )}
                                                    >
                                                        <Eye />
                                                        View
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setEditingStudent(
                                                            student,
                                                        )
                                                    }
                                                >
                                                    <Pencil />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    variant="destructive"
                                                    onClick={() =>
                                                        handleDelete(student)
                                                    }
                                                >
                                                    <Trash2 />
                                                    Remove
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <Pagination
                        links={paginatedStudents.links}
                        from={paginatedStudents.from}
                        to={paginatedStudents.to}
                        total={paginatedStudents.total}
                    />
                </div>
            </div>

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
