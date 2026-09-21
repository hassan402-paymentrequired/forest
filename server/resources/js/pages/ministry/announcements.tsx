import { Form, Head, router } from '@inertiajs/react';
import { Megaphone } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
    DataTable,
    DataTableCard,
    FilterBar,
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
import { MultiSelect } from '@/components/ui/multi-select';
import { Textarea } from '@/components/ui/textarea';
import { useListFilters } from '@/hooks/use-list-filters';
import { formatDate } from '@/lib/ministry';
import ministry from '@/routes/ministry';
import type { Paginated } from '@/types/pagination';

type Announcement = {
    id: string;
    title: string;
    body: string;
    status: 'active' | 'archived';
    sender: string | null;
    recipients: number;
    read: number;
    sent_at: string | null;
};

const statusLabel = { active: 'Active', archived: 'Archived' } as const;

export default function Announcements({
    announcements,
    filters: initialFilters,
    schools,
}: {
    announcements: Paginated<Announcement>;
    filters: { status?: string };
    schools: { id: string; name: string }[];
}) {
    const [composing, setComposing] = useState(false);
    const [audience, setAudience] = useState<'all' | 'selected'>('all');
    const [selected, setSelected] = useState<string[]>([]);
    const [target, setTarget] = useState<Announcement | null>(null);
    const [archiving, setArchiving] = useState(false);
    const [filters, setFilters] = useListFilters(
        ministry.announcements.index().url,
        { status: initialFilters.status ?? '' },
    );

    const archive = (announcement: Announcement) =>
        router.patch(
            ministry.announcements.archive({ announcement: announcement.id })
                .url,
            {},
            {
                onStart: () => setArchiving(true),
                onFinish: () => {
                    setArchiving(false);
                    setTarget(null);
                },
            },
        );

    return (
        <>
            <Head title="Announcements" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Announcements"
                        description="Notices sent to schools, and who has read them"
                    />

                    <Dialog open={composing} onOpenChange={setComposing}>
                        <DialogTrigger asChild>
                            <Button>
                                <Megaphone />
                                New announcement
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle>New announcement</DialogTitle>
                                <DialogDescription>
                                    Only active schools receive announcements.
                                </DialogDescription>
                            </DialogHeader>

                            <Form
                                {...ministry.announcements.store.form()}
                                resetOnSuccess
                                onSuccess={() => {
                                    setComposing(false);
                                    setAudience('all');
                                    setSelected([]);
                                }}
                                className="space-y-4"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="announcement-title">
                                                Title
                                            </Label>
                                            <Input
                                                id="announcement-title"
                                                name="title"
                                                required
                                                autoComplete="off"
                                            />
                                            <InputError
                                                message={errors.title}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="announcement-body">
                                                Message
                                            </Label>
                                            <Textarea
                                                id="announcement-body"
                                                name="body"
                                                required
                                                rows={5}
                                            />
                                            <InputError message={errors.body} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Send to</Label>
                                            <input
                                                type="hidden"
                                                name="audience"
                                                value={audience}
                                            />
                                            <div
                                                className="flex gap-2"
                                                role="group"
                                                aria-label="Audience"
                                            >
                                                {(
                                                    [
                                                        [
                                                            'all',
                                                            'All active schools',
                                                        ],
                                                        [
                                                            'selected',
                                                            'Chosen schools',
                                                        ],
                                                    ] as const
                                                ).map(([value, label]) => (
                                                    <Button
                                                        key={value}
                                                        type="button"
                                                        size="sm"
                                                        variant={
                                                            audience === value
                                                                ? 'default'
                                                                : 'outline'
                                                        }
                                                        aria-pressed={
                                                            audience === value
                                                        }
                                                        onClick={() =>
                                                            setAudience(value)
                                                        }
                                                    >
                                                        {label}
                                                    </Button>
                                                ))}
                                            </div>
                                            <InputError
                                                message={errors.audience}
                                            />
                                        </div>

                                        {audience === 'selected' && (
                                            <div className="grid gap-2">
                                                <Label htmlFor="announcement-schools">
                                                    Schools
                                                </Label>
                                                <MultiSelect
                                                    id="announcement-schools"
                                                    name="school_ids"
                                                    options={schools.map(
                                                        (school) => ({
                                                            value: school.id,
                                                            label: school.name,
                                                        }),
                                                    )}
                                                    value={selected}
                                                    onChange={setSelected}
                                                    placeholder="Choose schools..."
                                                    searchPlaceholder="Search schools..."
                                                />
                                                <InputError
                                                    message={errors.school_ids}
                                                />
                                            </div>
                                        )}

                                        <DialogFooter>
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                            >
                                                Send announcement
                                            </Button>
                                        </DialogFooter>
                                    </>
                                )}
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>

                <DataTableCard
                    title="Sent announcements"
                    icon={Megaphone}
                    count={announcements.total}
                    noun="announcement"
                    filters={
                        <FilterBar
                            activeCount={filters.status ? 1 : 0}
                            onClear={() => setFilters({ status: '' })}
                            className="lg:grid-cols-3"
                        >
                            <FilterSelect
                                id="announcement-status"
                                label="Status"
                                value={filters.status}
                                onChange={(value) =>
                                    setFilters({ status: value })
                                }
                                allLabel="All statuses"
                                options={Object.entries(statusLabel).map(
                                    ([value, label]) => ({ value, label }),
                                )}
                            />
                        </FilterBar>
                    }
                >
                    {announcements.data.length === 0 ? (
                        <TableEmptyState
                            icon={Megaphone}
                            title="No announcements yet"
                            description="Announcements you send will show up here."
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>Announcement</Th>
                                <Th align="right">Read</Th>
                                <Th>Status</Th>
                                <Th hideOnMobile>Sent</Th>
                                <Th align="right">
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </THead>
                            <TBody>
                                {announcements.data.map((announcement) => (
                                    <Tr key={announcement.id}>
                                        <Td className="max-w-md">
                                            <p className="font-medium">
                                                {announcement.title}
                                            </p>
                                            <p className="text-muted-foreground line-clamp-2 text-xs">
                                                {announcement.body}
                                            </p>
                                        </Td>
                                        <Td
                                            align="right"
                                            className="tabular-nums"
                                        >
                                            {announcement.read} of{' '}
                                            {announcement.recipients}
                                        </Td>
                                        <Td>
                                            <StatusBadge
                                                tone={
                                                    announcement.status ===
                                                    'active'
                                                        ? 'success'
                                                        : 'neutral'
                                                }
                                            >
                                                {
                                                    statusLabel[
                                                        announcement.status
                                                    ]
                                                }
                                            </StatusBadge>
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {formatDate(announcement.sent_at)}
                                            {announcement.sender && (
                                                <span className="block text-xs">
                                                    {announcement.sender}
                                                </span>
                                            )}
                                        </Td>
                                        <Td align="right">
                                            {announcement.status ===
                                                'active' && (
                                                <RowActions>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            setTarget(
                                                                announcement,
                                                            )
                                                        }
                                                    >
                                                        Archive
                                                    </DropdownMenuItem>
                                                </RowActions>
                                            )}
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </DataTable>
                    )}
                    <Pagination
                        links={announcements.links}
                        from={announcements.from}
                        to={announcements.to}
                        total={announcements.total}
                    />
                </DataTableCard>
            </div>

            {target && (
                <ConfirmDialog
                    open
                    title="Archive this announcement?"
                    description={`Schools will stop seeing “${target.title}”. It stays on record here.`}
                    confirmLabel="Archive"
                    processing={archiving}
                    onConfirm={() => archive(target)}
                    onCancel={() => setTarget(null)}
                />
            )}
        </>
    );
}

Announcements.layout = {
    breadcrumbs: [
        { title: 'Announcements', href: ministry.announcements.index() },
    ],
};
