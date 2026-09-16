import { Form, Head, router } from "@inertiajs/react";
import {
    ArrowLeftRight,
    Download,
    Search,
    Upload,
    UserCheck,
    UserPlus,
    Users,
} from "lucide-react";
import { useState } from "react";
import Heading from "@/components/heading";
import InputError from "@/components/input-error";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useListFilters } from "@/hooks/use-list-filters";
import students from "@/routes/students";
import type { Paginated } from "@/types/pagination";

type StudentStatus = "active" | "graduated" | "transferred" | "withdrawn";

type SchoolClassOption = {
    id: string;
    name: string;
};

type Student = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    admission_number: string | null;
    admission_date: string | null;
    status: StudentStatus;
    class: SchoolClassOption;
};

type Stats = {
    total: number;
    active: number;
    registered_this_month: number;
    transferred: number;
};

const statusLabel: Record<StudentStatus, string> = {
    active: "Active",
    graduated: "Graduated",
    transferred: "Transferred",
    withdrawn: "Withdrawn",
};

const statusVariant: Record<
    StudentStatus,
    "default" | "secondary" | "outline" | "destructive"
> = {
    active: "default",
    graduated: "secondary",
    transferred: "outline",
    withdrawn: "destructive",
};

function initials(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

function ClassSelect({
    classes,
    id,
    name,
    defaultValue,
}: {
    classes: SchoolClassOption[];
    id: string;
    name: string;
    defaultValue?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>Class</Label>
            <Select name={name} defaultValue={defaultValue}>
                <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                    {classes.map((schoolClass) => (
                        <SelectItem key={schoolClass.id} value={schoolClass.id}>
                            {schoolClass.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function AddStudentDialog({ classes }: { classes: SchoolClassOption[] }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={classes.length === 0}>Add Student</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a student</DialogTitle>
                </DialogHeader>

                <Form
                    {...students.store.form()}
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
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
                                    placeholder="Chidinma Okafor"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="off"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    autoComplete="off"
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="admission_number">
                                    Admission Number
                                </Label>
                                <Input
                                    id="admission_number"
                                    name="admission_number"
                                    autoComplete="off"
                                />
                                <InputError
                                    message={errors.admission_number}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="admission_date">
                                    Admission Date
                                </Label>
                                <Input
                                    id="admission_date"
                                    name="admission_date"
                                    type="date"
                                    defaultValue={
                                        new Date()
                                            .toISOString()
                                            .split("T")[0]
                                    }
                                />
                                <InputError
                                    message={errors.admission_date}
                                />
                            </div>

                            <ClassSelect
                                classes={classes}
                                id="class_id"
                                name="class_id"
                            />
                            <InputError message={errors.class_id} />

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Add Student
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function ImportStudentsDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload />
                    Import
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import students</DialogTitle>
                </DialogHeader>

                <Form
                    {...students.import.form()}
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="file">CSV file</Label>
                                <Input
                                    id="file"
                                    name="file"
                                    type="file"
                                    accept=".csv,.txt"
                                    required
                                />
                                <p className="text-muted-foreground text-xs">
                                    Columns: Name, Email, Phone, Admission
                                    Number, Admission Date, Class, Status.
                                    Rows with a class that doesn&apos;t match
                                    one of your existing classes are skipped.
                                </p>
                                <InputError message={errors.file} />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Import
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function EditStudentDialog({
    student,
    classes,
    onClose,
}: {
    student: Student;
    classes: SchoolClassOption[];
    onClose: () => void;
}) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {student.name}</DialogTitle>
                </DialogHeader>

                <Form
                    {...students.update.form(student)}
                    onSuccess={onClose}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    name="name"
                                    required
                                    defaultValue={student.name}
                                    autoComplete="off"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    name="email"
                                    defaultValue={student.email ?? ""}
                                    autoComplete="off"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input
                                    id="edit-phone"
                                    name="phone"
                                    defaultValue={student.phone ?? ""}
                                    autoComplete="off"
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-admission_number">
                                    Admission Number
                                </Label>
                                <Input
                                    id="edit-admission_number"
                                    name="admission_number"
                                    defaultValue={
                                        student.admission_number ?? ""
                                    }
                                    autoComplete="off"
                                />
                                <InputError
                                    message={errors.admission_number}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-admission_date">
                                    Admission Date
                                </Label>
                                <Input
                                    id="edit-admission_date"
                                    name="admission_date"
                                    type="date"
                                    defaultValue={
                                        student.admission_date ?? ""
                                    }
                                />
                                <InputError
                                    message={errors.admission_date}
                                />
                            </div>

                            <ClassSelect
                                classes={classes}
                                id="edit-class_id"
                                name="class_id"
                                defaultValue={student.class.id}
                            />
                            <InputError message={errors.class_id} />

                            <div className="grid gap-2">
                                <Label htmlFor="edit-status">Status</Label>
                                <Select
                                    name="status"
                                    defaultValue={student.status}
                                >
                                    <SelectTrigger
                                        id="edit-status"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
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
                                <InputError message={errors.status} />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function StudentsIndex({
    students: paginatedStudents,
    filters: initialFilters,
    classes,
    stats,
}: {
    students: Paginated<Student>;
    filters: { search?: string; status?: string; class_id?: string };
    classes: SchoolClassOption[];
    stats: Stats;
}) {
    const [editingStudent, setEditingStudent] = useState<Student | null>(
        null,
    );
    const [filters, setFilters] = useListFilters(students.index().url, {
        search: initialFilters.search ?? "",
        status: initialFilters.status ?? "",
        class_id: initialFilters.class_id ?? "",
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
                        <AddStudentDialog classes={classes} />
                    </div>
                </div>

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
                        <div className="font-xl font-semibold">
                            All Students
                        </div>
                        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
                            <div className="relative sm:max-w-xs">
                                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                                value={filters.class_id || "all"}
                                onValueChange={(value) =>
                                    setFilters((current) => ({
                                        ...current,
                                        class_id: value === "all" ? "" : value,
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
                                value={filters.status || "all"}
                                onValueChange={(value) =>
                                    setFilters((current) => ({
                                        ...current,
                                        status: value === "all" ? "" : value,
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
                                    Class
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
                                        colSpan={7}
                                        className="text-muted-foreground px-4 py-6 text-center"
                                    >
                                        No students found.
                                    </td>
                                </tr>
                            )}

                            {paginatedStudents.data.map((student) => (
                                <tr key={student.id}>
                                    <td className="px-4 py-3 font-medium">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarFallback className="text-xs">
                                                    {initials(student.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            {student.name}
                                        </div>
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {student.email}
                                        {student.email && student.phone
                                            ? " · "
                                            : ""}
                                        {student.phone}
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {student.admission_number ?? "—"}
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {student.admission_date
                                            ? new Date(
                                                  student.admission_date,
                                              ).toLocaleDateString(undefined, {
                                                  year: "numeric",
                                                  month: "short",
                                                  day: "numeric",
                                              })
                                            : "—"}
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {student.class.name}
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
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setEditingStudent(student)
                                            }
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() =>
                                                handleDelete(student)
                                            }
                                        >
                                            Remove
                                        </Button>
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
            title: "Students",
            href: students.index(),
        },
    ],
};
