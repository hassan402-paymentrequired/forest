import { Form, Head, Link, router } from "@inertiajs/react";
import { Search, Users } from "lucide-react";
import { useState } from "react";
import Heading from "@/components/heading";
import InputError from "@/components/input-error";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
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
import { useListFilters } from "@/hooks/use-list-filters";
import classes from "@/routes/classes";
import type { Paginated } from "@/types/pagination";

type SchoolClass = {
    id: string;
    name: string;
};

type Stats = {
    total: number;
};

function AddClassDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Add Class</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a class</DialogTitle>
                </DialogHeader>

                <Form
                    {...classes.store.form()}
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
                                    placeholder="JSS 1A"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Add Class
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function EditClassDialog({
    schoolClass,
    onClose,
}: {
    schoolClass: SchoolClass;
    onClose: () => void;
}) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {schoolClass.name}</DialogTitle>
                </DialogHeader>

                <Form
                    {...classes.update.form(schoolClass)}
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
                                    defaultValue={schoolClass.name}
                                    autoComplete="off"
                                />
                                <InputError message={errors.name} />
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

export default function ClassesIndex({
    classes: paginatedClasses,
    filters: initialFilters,
    stats,
}: {
    classes: Paginated<SchoolClass>;
    filters: { search?: string };
    stats: Stats;
}) {
    const [editingClass, setEditingClass] = useState<SchoolClass | null>(
        null,
    );
    const [filters, setFilters] = useListFilters(classes.index().url, {
        search: initialFilters.search ?? "",
    });

    const handleDelete = (schoolClass: SchoolClass) => {
        if (confirm(`Remove ${schoolClass.name} from the class list?`)) {
            router.delete(classes.destroy(schoolClass).url);
        }
    };

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
                </div>

                <div className="border-sidebar-border/70 dark:border-sidebar-border overflow-hidden rounded-xl border">
                    <div className="flex items-center justify-between px-6">
                        <div className="font-xl font-semibold">
                            All Classes
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
                                    placeholder="Search by name..."
                                    className="pl-8 sm:max-w-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium" />
                            </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                            {paginatedClasses.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={2}
                                        className="text-muted-foreground px-4 py-6 text-center"
                                    >
                                        No classes found.
                                    </td>
                                </tr>
                            )}

                            {paginatedClasses.data.map((schoolClass) => (
                                <tr key={schoolClass.id}>
                                    <td className="px-4 py-3 font-medium">
                                        <Link
                                            href={classes.show(schoolClass)}
                                            className="hover:underline"
                                        >
                                            {schoolClass.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={classes.show(
                                                    schoolClass,
                                                )}
                                            >
                                                View
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setEditingClass(schoolClass)
                                            }
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() =>
                                                handleDelete(schoolClass)
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
                        links={paginatedClasses.links}
                        from={paginatedClasses.from}
                        to={paginatedClasses.to}
                        total={paginatedClasses.total}
                    />
                </div>
            </div>

            {editingClass && (
                <EditClassDialog
                    schoolClass={editingClass}
                    onClose={() => setEditingClass(null)}
                />
            )}
        </>
    );
}

ClassesIndex.layout = {
    breadcrumbs: [
        {
            title: "Classes",
            href: classes.index(),
        },
    ],
};
