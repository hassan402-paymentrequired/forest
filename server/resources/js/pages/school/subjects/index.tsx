import { Form, Head, Link, router } from '@inertiajs/react';
import { BookOpen } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
import {
    DataTable,
    DataTableCard,
    FilterBar,
    FilterSearch,
    RowActions,
    TBody,
    TableEmptyState,
    THead,
    Td,
    Th,
    Tr,
} from '@/components/data-table';
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
    teachers_count: number;
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

    const update = (key: keyof typeof filters, value: string) =>
        setFilters((current) => ({ ...current, [key]: value }));
    const activeCount = Object.values(filters).filter(Boolean).length;
    const clearFilters = () => setFilters({ search: '' });

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
                        </FilterBar>
                    }
                >
                    {paginatedSubjects.data.length === 0 ? (
                        <TableEmptyState
                            icon={BookOpen}
                            title="No subjects found"
                            description={
                                activeCount > 0
                                    ? 'Nothing matches this search. Try clearing it.'
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
                        <DataTable>
                            <THead>
                                <Th>Name</Th>
                                <Th>Qualified Teachers</Th>
                                <Th align="right">
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </THead>
                            <TBody>
                                {paginatedSubjects.data.map((subject) => (
                                    <Tr key={subject.id}>
                                        <Td className="font-medium">
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
                                        <Td align="right">
                                            <RowActions
                                                viewHref={subjects.show(
                                                    subject,
                                                )}
                                                onEdit={() =>
                                                    setEditingSubject(subject)
                                                }
                                                onDelete={() =>
                                                    handleDelete(subject)
                                                }
                                            />
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
