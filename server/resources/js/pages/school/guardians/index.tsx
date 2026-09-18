import { Form, Head, Link, router } from '@inertiajs/react';
import { Download, Star, Upload, Users } from 'lucide-react';
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
import guardians from '@/routes/guardians';
import type { Paginated } from '@/types/pagination';

type GuardianRelationship = 'father' | 'mother' | 'guardian' | 'other';

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
    father: 'Father',
    mother: 'Mother',
    guardian: 'Guardian',
    other: 'Other',
};

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
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
                    {Object.entries(relationshipLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                            {label}
                        </SelectItem>
                    ))}
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
                                    admission numbers match an existing student
                                    are skipped.
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
                                    defaultValue={guardian.email ?? ''}
                                    autoComplete="off"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input
                                    id="edit-phone"
                                    name="phone"
                                    defaultValue={guardian.phone ?? ''}
                                    autoComplete="off"
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <RelationshipSelect
                                id="edit-relationship"
                                defaultValue={
                                    guardian.relationship ?? undefined
                                }
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
        search: initialFilters.search ?? '',
    });

    const update = (key: keyof typeof filters, value: string) =>
        setFilters((current) => ({ ...current, [key]: value }));
    const activeCount = Object.values(filters).filter(Boolean).length;
    const clearFilters = () => setFilters({ search: '' });

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

                <DataTableCard
                    title="All guardians"
                    icon={Users}
                    count={paginatedGuardians.total}
                    noun="guardian"
                    filters={
                        <FilterBar
                            activeCount={activeCount}
                            onClear={clearFilters}
                            className="lg:grid-cols-3"
                        >
                            <FilterSearch
                                id="guardians-search"
                                value={filters.search}
                                onChange={(value) => update('search', value)}
                                placeholder="Name, email or phone..."
                            />
                        </FilterBar>
                    }
                >
                    {paginatedGuardians.data.length === 0 ? (
                        <TableEmptyState
                            icon={Users}
                            title="No guardians found"
                            description={
                                activeCount > 0
                                    ? 'Nothing matches this search. Try clearing it.'
                                    : 'Guardians you add will show up here.'
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
                                <Th>Relationship</Th>
                                <Th hideOnMobile>Children</Th>
                                <Th align="right">
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </THead>
                            <TBody>
                                {paginatedGuardians.data.map((guardian) => (
                                    <Tr key={guardian.id}>
                                        <Td className="font-medium">
                                            <Link
                                                href={guardians.show(guardian)}
                                                className="flex items-center gap-3 hover:underline"
                                            >
                                                <Avatar>
                                                    <AvatarFallback className="text-xs">
                                                        {initials(
                                                            guardian.name,
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {guardian.name}
                                            </Link>
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {guardian.email}
                                            {guardian.email && guardian.phone
                                                ? ' · '
                                                : ''}
                                            {guardian.phone}
                                        </Td>
                                        <Td>
                                            <div className="flex items-center gap-2">
                                                {guardian.relationship && (
                                                    <StatusBadge tone="neutral">
                                                        {
                                                            relationshipLabel[
                                                                guardian
                                                                    .relationship
                                                            ]
                                                        }
                                                    </StatusBadge>
                                                )}
                                                {guardian.is_primary && (
                                                    <StatusBadge tone="success">
                                                        Primary
                                                    </StatusBadge>
                                                )}
                                            </div>
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {guardian.students
                                                .map((student) => student.name)
                                                .join(', ') || '—'}
                                        </Td>
                                        <Td align="right">
                                            <RowActions
                                                viewHref={guardians.show(
                                                    guardian,
                                                )}
                                                onEdit={() =>
                                                    setEditingGuardian(guardian)
                                                }
                                                onDelete={() =>
                                                    handleDelete(guardian)
                                                }
                                            />
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </DataTable>
                    )}

                    <Pagination
                        links={paginatedGuardians.links}
                        from={paginatedGuardians.from}
                        to={paginatedGuardians.to}
                        total={paginatedGuardians.total}
                    />
                </DataTableCard>
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
            title: 'Guardians',
            href: guardians.index(),
        },
    ],
};
