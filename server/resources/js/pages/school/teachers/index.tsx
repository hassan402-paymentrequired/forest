import { Form, Head, Link, router } from "@inertiajs/react";
import { ArrowLeftRight, Clock, Search, UserCheck, Users } from "lucide-react";
import { useState } from "react";
import Heading from "@/components/heading";
import InputError from "@/components/input-error";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
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
import teachers from "@/routes/teachers";
import type { Paginated } from "@/types/pagination";

type TeacherStatus = "active" | "on_leave" | "transferred" | "inactive";

type Teacher = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    subjects: string[];
    status: TeacherStatus;
};

type Stats = {
    total: number;
    active: number;
    on_leave: number;
    transferred: number;
};

const statusLabel: Record<TeacherStatus, string> = {
    active: "Active",
    on_leave: "On Leave",
    transferred: "Transferred",
    inactive: "Inactive",
};

const statusVariant: Record<
    TeacherStatus,
    "default" | "secondary" | "outline" | "destructive"
> = {
    active: "default",
    on_leave: "secondary",
    transferred: "outline",
    inactive: "destructive",
};

function SubjectsInput({ defaultValue = "" }: { defaultValue?: string }) {
    const [text, setText] = useState(defaultValue);
    const subjects = text
        .split(",")
        .map((subject) => subject.trim())
        .filter(Boolean);

    return (
        <div className="grid gap-2">
            <Label htmlFor="subjects">Subjects</Label>
            <Input
                id="subjects"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Mathematics, Physics"
            />
            <p className="text-muted-foreground text-xs">Comma-separated</p>
            {subjects.map((subject) => (
                <input
                    key={subject}
                    type="hidden"
                    name="subjects[]"
                    value={subject}
                />
            ))}
        </div>
    );
}

function AddTeacherDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Add Teacher</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a teacher</DialogTitle>
                </DialogHeader>

                <Form
                    {...teachers.store.form()}
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
                                    placeholder="Mrs. Adebayo"
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

                            <SubjectsInput />

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Add Teacher
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function EditTeacherDialog({
    teacher,
    onClose,
}: {
    teacher: Teacher;
    onClose: () => void;
}) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {teacher.name}</DialogTitle>
                </DialogHeader>

                <Form
                    {...teachers.update.form(teacher)}
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
                                    defaultValue={teacher.name}
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
                                    defaultValue={teacher.email ?? ""}
                                    autoComplete="off"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input
                                    id="edit-phone"
                                    name="phone"
                                    defaultValue={teacher.phone ?? ""}
                                    autoComplete="off"
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <SubjectsInput
                                defaultValue={teacher.subjects.join(", ")}
                            />

                            <div className="grid gap-2">
                                <Label htmlFor="edit-status">Status</Label>
                                <Select
                                    name="status"
                                    defaultValue={teacher.status}
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

export default function TeachersIndex({
    teachers: paginatedTeachers,
    filters: initialFilters,
    stats,
}: {
    teachers: Paginated<Teacher>;
    filters: { search?: string; status?: string };
    stats: Stats;
}) {
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [filters, setFilters] = useListFilters(teachers.index().url, {
        search: initialFilters.search ?? "",
        status: initialFilters.status ?? "",
    });

    const handleDelete = (teacher: Teacher) => {
        if (confirm(`Remove ${teacher.name} from the teacher directory?`)) {
            router.delete(teachers.destroy(teacher).url);
        }
    };

    return (
        <>
            <Head title="Teachers" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Teachers"
                        description="Manage your school's teaching staff"
                    />

                    <AddTeacherDialog />
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

                <div className="border-sidebar-border/70 dark:border-sidebar-border overflow-hidden rounded-xl border">
                    <div className="flex items-center justify-between px-6">
                        <div className="font-xl font-semibold">
                            All Teachers
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
                                    placeholder="Search by name or email..."
                                    className="pl-8 sm:max-w-xs h-10"
                                />
                            </div>
                            <Select
                                value={filters.status || "all"}
                                onValueChange={(value) =>
                                    setFilters((current) => ({
                                        ...current,
                                        status: value === "all" ? "" : value,
                                    }))
                                }
                            >
                                <SelectTrigger className="sm:w-48 h-10">
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
                                    Subjects
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Status
                                </th>
                                <th className="px-4 py-3 font-medium" />
                            </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                            {paginatedTeachers.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-muted-foreground px-4 py-6 text-center"
                                    >
                                        No teachers found.
                                    </td>
                                </tr>
                            )}

                            {paginatedTeachers.data.map((teacher) => (
                                <tr key={teacher.id}>
                                    <td className="px-4 py-3 font-medium">
                                        <Link
                                            href={teachers.show(teacher)}
                                            className="hover:underline"
                                        >
                                            {teacher.name}
                                        </Link>
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {teacher.email}
                                        {teacher.email && teacher.phone
                                            ? " · "
                                            : ""}
                                        {teacher.phone}
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {teacher.subjects.join(", ") || "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant={
                                                statusVariant[teacher.status]
                                            }
                                        >
                                            {statusLabel[teacher.status]}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={teachers.show(teacher)}>
                                                View
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setEditingTeacher(teacher)
                                            }
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() =>
                                                handleDelete(teacher)
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
                        links={paginatedTeachers.links}
                        from={paginatedTeachers.from}
                        to={paginatedTeachers.to}
                        total={paginatedTeachers.total}
                    />
                </div>
            </div>

            {editingTeacher && (
                <EditTeacherDialog
                    teacher={editingTeacher}
                    onClose={() => setEditingTeacher(null)}
                />
            )}
        </>
    );
}

TeachersIndex.layout = {
    breadcrumbs: [
        {
            title: "Teachers",
            href: teachers.index(),
        },
    ],
};
