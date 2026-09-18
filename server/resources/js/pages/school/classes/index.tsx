import { Form, Head, Link, router } from '@inertiajs/react';
import { School, Users } from 'lucide-react';
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
import classes from '@/routes/classes';
import type { Paginated } from '@/types/pagination';

type TeacherOption = {
    id: string;
    name: string;
};

type SchoolClass = {
    id: string;
    name: string;
    students_count: number;
    teacher: TeacherOption | null;
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
    const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
    const [filters, setFilters] = useListFilters(classes.index().url, {
        search: initialFilters.search ?? '',
    });

    const update = (key: keyof typeof filters, value: string) =>
        setFilters((current) => ({ ...current, [key]: value }));
    const activeCount = Object.values(filters).filter(Boolean).length;
    const clearFilters = () => setFilters({ search: '' });

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

                <DataTableCard
                    title="All classes"
                    icon={School}
                    count={paginatedClasses.total}
                    noun="class"
                    filters={
                        <FilterBar
                            activeCount={activeCount}
                            onClear={clearFilters}
                            className="lg:grid-cols-3"
                        >
                            <FilterSearch
                                id="classes-search"
                                value={filters.search}
                                onChange={(value) => update('search', value)}
                                placeholder="Name..."
                            />
                        </FilterBar>
                    }
                >
                    {paginatedClasses.data.length === 0 ? (
                        <TableEmptyState
                            icon={School}
                            title="No classes found"
                            description={
                                activeCount > 0
                                    ? 'Nothing matches this search. Try clearing it.'
                                    : 'Classes you add will show up here.'
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
                                <Th>Class Teacher</Th>
                                <Th>Students</Th>
                                <Th align="right">
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </THead>
                            <TBody>
                                {paginatedClasses.data.map((schoolClass) => (
                                    <Tr key={schoolClass.id}>
                                        <Td className="font-medium">
                                            <Link
                                                href={classes.show(schoolClass)}
                                                className="hover:underline"
                                            >
                                                {schoolClass.name}
                                            </Link>
                                        </Td>
                                        <Td muted>
                                            {schoolClass.teacher?.name ?? '—'}
                                        </Td>
                                        <Td muted className="tabular-nums">
                                            {schoolClass.students_count}
                                        </Td>
                                        <Td align="right">
                                            <RowActions
                                                viewHref={classes.show(
                                                    schoolClass,
                                                )}
                                                onEdit={() =>
                                                    setEditingClass(schoolClass)
                                                }
                                                onDelete={() =>
                                                    handleDelete(schoolClass)
                                                }
                                            />
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </DataTable>
                    )}

                    <Pagination
                        links={paginatedClasses.links}
                        from={paginatedClasses.from}
                        to={paginatedClasses.to}
                        total={paginatedClasses.total}
                    />
                </DataTableCard>
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
            title: 'Classes',
            href: classes.index(),
        },
    ],
};
