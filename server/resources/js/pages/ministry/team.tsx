import { Form, Head, router } from '@inertiajs/react';
import { ShieldCheck, UserCog, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
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
} from '@/components/data-table';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useListFilters } from '@/hooks/use-list-filters';
import { formatDate } from '@/lib/ministry';
import ministry from '@/routes/ministry';
import type { Paginated } from '@/types/pagination';

type Member = {
    id: string;
    name: string;
    email: string;
    status: 'active' | 'inactive';
    two_factor_enabled: boolean;
    joined_at: string | null;
};

const statusLabel = { active: 'Active', inactive: 'Inactive' } as const;

export default function Team({
    members,
    filters: initialFilters,
    current_user_id: currentUserId,
}: {
    members: Paginated<Member>;
    filters: { search?: string; status?: string };
    current_user_id: string;
}) {
    const [inviting, setInviting] = useState(false);
    const [target, setTarget] = useState<Member | null>(null);
    const [processing, setProcessing] = useState(false);
    const [filters, setFilters] = useListFilters(ministry.team.index().url, {
        search: initialFilters.search ?? '',
        status: initialFilters.status ?? '',
    });

    const update = (key: keyof typeof filters, value: string) =>
        setFilters((current) => ({ ...current, [key]: value }));
    const activeCount = Object.values(filters).filter(Boolean).length;
    const clear = () => setFilters({ search: '', status: '' });

    const changeStatus = (member: Member, status: 'active' | 'inactive') =>
        router.patch(
            ministry.team.status.update({ ministryUser: member.id }).url,
            { status },
            {
                onStart: () => setProcessing(true),
                onFinish: () => {
                    setProcessing(false);
                    setTarget(null);
                },
            },
        );

    return (
        <>
            <Head title="Team" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Team"
                        description="Ministry staff who can use this portal"
                    />

                    <Dialog open={inviting} onOpenChange={setInviting}>
                        <DialogTrigger asChild>
                            <Button>
                                <UserPlus />
                                Add member
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add a team member</DialogTitle>
                                <DialogDescription>
                                    They are emailed a link to set their own
                                    password.
                                </DialogDescription>
                            </DialogHeader>

                            <Form
                                {...ministry.team.store.form()}
                                resetOnSuccess
                                onSuccess={() => setInviting(false)}
                                className="space-y-4"
                            >
                                {({ processing: sending, errors }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="member-name">
                                                Name
                                            </Label>
                                            <Input
                                                id="member-name"
                                                name="name"
                                                required
                                                autoComplete="off"
                                            />
                                            <InputError message={errors.name} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="member-email">
                                                Email
                                            </Label>
                                            <Input
                                                id="member-email"
                                                type="email"
                                                name="email"
                                                required
                                                autoComplete="off"
                                                placeholder="name@education.gov.ng"
                                            />
                                            <InputError
                                                message={errors.email}
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                type="submit"
                                                disabled={sending}
                                            >
                                                Send invitation
                                            </Button>
                                        </DialogFooter>
                                    </>
                                )}
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>

                <DataTableCard
                    title="Ministry staff"
                    icon={UserCog}
                    count={members.total}
                    noun="member"
                    filters={
                        <FilterBar
                            activeCount={activeCount}
                            onClear={clear}
                            className="lg:grid-cols-3"
                        >
                            <FilterSearch
                                id="team-search"
                                value={filters.search}
                                onChange={(value) => update('search', value)}
                                placeholder="Name or email..."
                            />
                            <FilterSelect
                                id="team-status"
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
                    {members.data.length === 0 ? (
                        <TableEmptyState
                            icon={UserCog}
                            title="No team members found"
                            description="Nothing matches these filters."
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>Name</Th>
                                <Th hideOnMobile>Email</Th>
                                <Th>Status</Th>
                                <Th hideOnMobile>Security</Th>
                                <Th hideOnMobile>Joined</Th>
                                <Th align="right">
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </THead>
                            <TBody>
                                {members.data.map((member) => (
                                    <Tr key={member.id}>
                                        <Td className="font-medium">
                                            {member.name}
                                            {member.id === currentUserId && (
                                                <span className="text-muted-foreground ml-2 text-xs font-normal">
                                                    You
                                                </span>
                                            )}
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {member.email}
                                        </Td>
                                        <Td>
                                            <StatusBadge
                                                tone={
                                                    member.status === 'active'
                                                        ? 'success'
                                                        : 'neutral'
                                                }
                                            >
                                                {statusLabel[member.status]}
                                            </StatusBadge>
                                        </Td>
                                        <Td hideOnMobile>
                                            {member.two_factor_enabled ? (
                                                <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                                                    <ShieldCheck className="size-3.5" />
                                                    2FA on
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">
                                                    2FA off
                                                </span>
                                            )}
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {formatDate(member.joined_at)}
                                        </Td>
                                        <Td align="right">
                                            {member.status === 'inactive' ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        changeStatus(
                                                            member,
                                                            'active',
                                                        )
                                                    }
                                                >
                                                    Reactivate
                                                </Button>
                                            ) : member.id !== currentUserId ? (
                                                <RowActions>
                                                    <DropdownMenuItem
                                                        variant="destructive"
                                                        onClick={() =>
                                                            setTarget(member)
                                                        }
                                                    >
                                                        Deactivate
                                                    </DropdownMenuItem>
                                                </RowActions>
                                            ) : null}
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </DataTable>
                    )}
                    <Pagination
                        links={members.links}
                        from={members.from}
                        to={members.to}
                        total={members.total}
                    />
                </DataTableCard>
            </div>

            {target && (
                <ConfirmDialog
                    open
                    title="Deactivate this member?"
                    description={`${target.name} will be signed out and won't be able to log in until reactivated.`}
                    confirmLabel="Deactivate"
                    destructive
                    processing={processing}
                    onConfirm={() => changeStatus(target, 'inactive')}
                    onCancel={() => setTarget(null)}
                />
            )}
        </>
    );
}

Team.layout = {
    breadcrumbs: [{ title: 'Team', href: ministry.team.index() }],
};
