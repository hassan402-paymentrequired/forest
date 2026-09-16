import { Form, Head, router } from "@inertiajs/react";
import { Download, Search, Star, Upload, Users } from "lucide-react";
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
import guardians from "@/routes/guardians";
import type { Paginated } from "@/types/pagination";

type GuardianRelationship = "father" | "mother" | "guardian" | "other";

type StudentOption = {
    id: string;
    name: string;
};

type Guardian = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    relationship: GuardianRelationship | null;
    is_primary: boolean;
    students: StudentOption[];
};

type Stats = {
    total: number;
    primary_contacts: number;
};

const relationshipLabel: Record<GuardianRelationship, string> = {
    father: "Father",
    mother: "Mother",
    guardian: "Guardian",
    other: "Other",
};

function initials(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

function StudentsCheckboxList({
    students,
    idPrefix,
    defaultSelected = [],
}: {
    students: StudentOption[];
    idPrefix: string;
    defaultSelected?: string[];
}) {
    return (
        <div className="grid gap-2">
            <Label>Children</Label>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {students.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                        No students yet — add a student first.
                    </p>
                )}
                {students.map((student) => (
                    <label
                        key={student.id}
                        htmlFor={`${idPrefix}-student-${student.id}`}
                        className="flex items-center gap-2 text-sm"
                    >
                        <input
                            id={`${idPrefix}-student-${student.id}`}
                            type="checkbox"
                            name="student_ids[]"
                            value={student.id}
                            defaultChecked={defaultSelected.includes(
                                student.id,
                            )}
                            className="border-input size-4 rounded"
                        />
                        {student.name}
                    </label>
                ))}
            </div>
        </div>
    );
}

function PrimaryContactCheckbox({
    id,
    defaultChecked,
}: {
    id: string;
    defaultChecked?: boolean;
}) {
    return (
        <label htmlFor={id} className="flex items-center gap-2 text-sm">
            <input
                id={id}
                type="checkbox"
                name="is_primary"
                value="1"
                defaultChecked={defaultChecked}
                className="border-input size-4 rounded"
            />
            Primary contact for these children
        </label>
    );
}

function RelationshipSelect({
    id,
    defaultValue,
}: {
    id: string;
    defaultValue?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>Relationship</Label>
            <Select name="relationship" defaultValue={defaultValue}>
                <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder="Select a relationship" />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(relationshipLabel).map(
                        ([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ),
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}

function AddGuardianDialog({ students }: { students: StudentOption[] }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={students.length === 0}>Add Guardian</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a guardian</DialogTitle>
                </DialogHeader>

                <Form
                    {...guardians.store.form()}
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
                                    placeholder="Jane Okafor"
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

                            <RelationshipSelect id="relationship" />
                            <InputError message={errors.relationship} />

                            <PrimaryContactCheckbox id="is_primary" />

                            <StudentsCheckboxList
                                students={students}
                                idPrefix="add"
                            />
                            <InputError message={errors.student_ids} />

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Add Guardian
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function ImportGuardiansDialog() {
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
                    <DialogTitle>Import guardians</DialogTitle>
                </DialogHeader>

                <Form
                    {...guardians.import.form()}
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
                                    Columns: Name, Email, Phone, Relationship,
                                    Primary, Children. Children lists each
                                    student as &quot;Name
                                    (AdmissionNumber)&quot;, separated by
                                    semicolons — rows where none of the
                                    admission numbers match an existing
                                    student are skipped.
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

function EditGuardianDialog({
    guardian,
    students,
    onClose,
}: {
    guardian: Guardian;
    students: StudentOption[];
    onClose: () => void;
}) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {guardian.name}</DialogTitle>
                </DialogHeader>

                <Form
                    {...guardians.update.form(guardian)}
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
                                    defaultValue={guardian.name}
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
                                    defaultValue={guardian.email ?? ""}
                                    autoComplete="off"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input
                                    id="edit-phone"
                                    name="phone"
                                    defaultValue={guardian.phone ?? ""}
                                    autoComplete="off"
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <RelationshipSelect
                                id="edit-relationship"
                                defaultValue={guardian.relationship ?? undefined}
                            />
                            <InputError message={errors.relationship} />

                            <PrimaryContactCheckbox
                                id="edit-is_primary"
                                defaultChecked={guardian.is_primary}
                            />

                            <StudentsCheckboxList
                                students={students}
                                idPrefix="edit"
                                defaultSelected={guardian.students.map(
                                    (student) => student.id,
                                )}
                            />
                            <InputError message={errors.student_ids} />

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

export default function GuardiansIndex({
    guardians: paginatedGuardians,
    filters: initialFilters,
    students,
    stats,
}: {
    guardians: Paginated<Guardian>;
    filters: { search?: string };
    students: StudentOption[];
    stats: Stats;
}) {
    const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(
        null,
    );
    const [filters, setFilters] = useListFilters(guardians.index().url, {
        search: initialFilters.search ?? "",
    });

    const handleDelete = (guardian: Guardian) => {
        if (confirm(`Remove ${guardian.name} from the guardian directory?`)) {
            router.delete(guardians.destroy(guardian).url);
        }
    };

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
                        <AddGuardianDialog students={students} />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <StatCard
                        label="Total Guardians"
                        value={stats.total}
                        icon={Users}
                    />
                    <StatCard
                        label="Primary Contacts"
                        value={stats.primary_contacts}
                        icon={Star}
                    />
                </div>

                <div className="border-sidebar-border/70 dark:border-sidebar-border overflow-hidden rounded-xl border">
                    <div className="flex items-center justify-between px-6">
                        <div className="font-xl font-semibold">
                            All Guardians
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
                                    placeholder="Search by name, email or phone..."
                                    className="pl-8 sm:max-w-xs"
                                />
                            </div>
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
                                    Relationship
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Children
                                </th>
                                <th className="px-4 py-3 font-medium" />
                            </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                            {paginatedGuardians.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-muted-foreground px-4 py-6 text-center"
                                    >
                                        No guardians found.
                                    </td>
                                </tr>
                            )}

                            {paginatedGuardians.data.map((guardian) => (
                                <tr key={guardian.id}>
                                    <td className="px-4 py-3 font-medium">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarFallback className="text-xs">
                                                    {initials(guardian.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            {guardian.name}
                                        </div>
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {guardian.email}
                                        {guardian.email && guardian.phone
                                            ? " · "
                                            : ""}
                                        {guardian.phone}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {guardian.relationship && (
                                                <Badge variant="outline">
                                                    {
                                                        relationshipLabel[
                                                            guardian
                                                                .relationship
                                                        ]
                                                    }
                                                </Badge>
                                            )}
                                            {guardian.is_primary && (
                                                <Badge>Primary</Badge>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {guardian.students
                                            .map((student) => student.name)
                                            .join(", ") || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setEditingGuardian(guardian)
                                            }
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() =>
                                                handleDelete(guardian)
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
                        links={paginatedGuardians.links}
                        from={paginatedGuardians.from}
                        to={paginatedGuardians.to}
                        total={paginatedGuardians.total}
                    />
                </div>
            </div>

            {editingGuardian && (
                <EditGuardianDialog
                    guardian={editingGuardian}
                    students={students}
                    onClose={() => setEditingGuardian(null)}
                />
            )}
        </>
    );
}

GuardiansIndex.layout = {
    breadcrumbs: [
        {
            title: "Guardians",
            href: guardians.index(),
        },
    ],
};
