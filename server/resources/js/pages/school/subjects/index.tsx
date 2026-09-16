import { Form, Head, router } from '@inertiajs/react';
import { BookOpen, Search } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useListFilters } from '@/hooks/use-list-filters';
import subjects from '@/routes/subjects';
import type { Paginated } from '@/types/pagination';

type Subject = {
    id: string;
    name: string;
};

type Stats = {
    total: number;
};

function AddSubjectDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Add Subject</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a subject</DialogTitle>
                </DialogHeader>

                <Form
                    {...subjects.store.form()}
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
                                    placeholder="Mathematics"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Add Subject
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function EditSubjectDialog({
    subject,
    onClose,
}: {
    subject: Subject;
    onClose: () => void;
}) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {subject.name}</DialogTitle>
                </DialogHeader>

                <Form
                    {...subjects.update.form(subject)}
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
                                    defaultValue={subject.name}
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

export default function SubjectsIndex({
    subjects: paginatedSubjects,
    filters: initialFilters,
    stats,
}: {
    subjects: Paginated<Subject>;
    filters: { search?: string };
    stats: Stats;
}) {
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [filters, setFilters] = useListFilters(subjects.index().url, {
        search: initialFilters.search ?? '',
    });

    const handleDelete = (subject: Subject) => {
        if (confirm(`Remove ${subject.name} from the subject list?`)) {
            router.delete(subjects.destroy(subject).url);
        }
    };

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
                </div>

                <div className="border-sidebar-border/70 dark:border-sidebar-border overflow-hidden rounded-xl border">
                    <div className="flex items-center justify-between px-6">
                        <div className="font-xl font-semibold">
                            All Subjects
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
                            {paginatedSubjects.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={2}
                                        className="text-muted-foreground px-4 py-6 text-center"
                                    >
                                        No subjects found.
                                    </td>
                                </tr>
                            )}

                            {paginatedSubjects.data.map((subject) => (
                                <tr key={subject.id}>
                                    <td className="px-4 py-3 font-medium">
                                        {subject.name}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setEditingSubject(subject)
                                            }
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() =>
                                                handleDelete(subject)
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
                        links={paginatedSubjects.links}
                        from={paginatedSubjects.from}
                        to={paginatedSubjects.to}
                        total={paginatedSubjects.total}
                    />
                </div>
            </div>

            {editingSubject && (
                <EditSubjectDialog
                    subject={editingSubject}
                    onClose={() => setEditingSubject(null)}
                />
            )}
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
