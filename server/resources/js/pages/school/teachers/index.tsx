import { Form, Head, Link, router } from '@inertiajs/react';
import { ArrowLeftRight, Clock, UserCheck, Users } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
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
    type Tone,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useListFilters } from '@/hooks/use-list-filters';
import teachers from '@/routes/teachers';
import type { Paginated } from '@/types/pagination';

type TeacherStatus = 'active' | 'on_leave' | 'transferred' | 'inactive';

type SubjectOption = {
    id: string;
    name: string;
};

type ClassOption = {
    id: string;
    name: string;
};

type Teacher = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    subjects: SubjectOption[];
    classes: ClassOption[];
    status: TeacherStatus;
};

type Stats = {
    total: number;
    active: number;
    on_leave: number;
    transferred: number;
};

const statusLabel: Record<TeacherStatus, string> = {
    active: 'Active',
    on_leave: 'On Leave',
    transferred: 'Transferred',
    inactive: 'Inactive',
};

const statusTone: Record<TeacherStatus, Tone> = {
    active: 'success',
    on_leave: 'warning',
    transferred: 'info',
    inactive: 'danger',
};

function SubjectsCheckboxList({
    subjects,
    idPrefix,
    defaultSelected = [],
}: {
    subjects: SubjectOption[];
    idPrefix: string;
    defaultSelected?: string[];
}) {
    return (
        <div className="grid gap-2">
            <Label>Subjects</Label>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {subjects.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                        No subjects yet — add one from the Subjects page first.
                    </p>
                )}
                {subjects.map((subject) => (
                    <label
                        key={subject.id}
                        htmlFor={`${idPrefix}-subject-${subject.id}`}
                        className="flex items-center gap-2 text-sm"
                    >
                        <input
                            id={`${idPrefix}-subject-${subject.id}`}
                            type="checkbox"
                            name="subject_ids[]"
                            value={subject.id}
                            defaultChecked={defaultSelected.includes(
                                subject.id,
                            )}
                            className="border-input size-4 rounded"
                        />
                        {subject.name}
                    </label>
                ))}
            </div>
        </div>
    );
}

function AddTeacherDialog({ subjects }: { subjects: SubjectOption[] }) {
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

                            <SubjectsCheckboxList
                                subjects={subjects}
                                idPrefix="add"
                            />

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
    subjects,
    onClose,
}: {
    teacher: Teacher;
    subjects: SubjectOption[];
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
                                    defaultValue={teacher.email ?? ''}
                                    autoComplete="off"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input
                                    id="edit-phone"
                                    name="phone"
                                    defaultValue={teacher.phone ?? ''}
                                    autoComplete="off"
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <SubjectsCheckboxList
                                subjects={subjects}
                                idPrefix="edit"
                                defaultSelected={teacher.subjects.map(
                                    (subject) => subject.id,
                                )}
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
    subjects,
    stats,
}: {
    teachers: Paginated<Teacher>;
    filters: { search?: string; status?: string };
    subjects: SubjectOption[];
    stats: Stats;
}) {
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [filters, setFilters] = useListFilters(teachers.index().url, {
        search: initialFilters.search ?? '',
        status: initialFilters.status ?? '',
    });

    const update = (key: keyof typeof filters, value: string) =>
        setFilters((current) => ({ ...current, [key]: value }));
    const activeCount = Object.values(filters).filter(Boolean).length;
    const clearFilters = () => setFilters({ search: '', status: '' });

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
                        <DataTable>
                            <THead>
                                <Th>Name</Th>
                                <Th hideOnMobile>Contact</Th>
                                <Th hideOnMobile>Subjects</Th>
                                <Th hideOnMobile>Classes</Th>
                                <Th>Status</Th>
                                <Th align="right">
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </THead>
                            <TBody>
                                {paginatedTeachers.data.map((teacher) => (
                                    <Tr key={teacher.id}>
                                        <Td className="font-medium">
                                            <Link
                                                href={teachers.show(teacher)}
                                                className="hover:underline"
                                            >
                                                {teacher.name}
                                            </Link>
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {teacher.email}
                                            {teacher.email && teacher.phone
                                                ? ' · '
                                                : ''}
                                            {teacher.phone}
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {teacher.subjects
                                                .map((subject) => subject.name)
                                                .join(', ') || '—'}
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {teacher.classes
                                                .map(
                                                    (schoolClass) =>
                                                        schoolClass.name,
                                                )
                                                .join(', ') || '—'}
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
                                        <Td align="right">
                                            <RowActions
                                                viewHref={teachers.show(
                                                    teacher,
                                                )}
                                                onEdit={() =>
                                                    setEditingTeacher(teacher)
                                                }
                                                onDelete={() =>
                                                    handleDelete(teacher)
                                                }
                                            />
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
