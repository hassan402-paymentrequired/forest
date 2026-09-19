import { Head, router } from '@inertiajs/react';
import { CalendarRange, CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import Heading from '@/components/heading';
import {
    DataTable,
    DataTableCard,
    RowActions,
    StatusBadge,
    TBody,
    TableEmptyState,
    THead,
    Td,
    Th,
    Tr,
} from '@/components/data-table';
import { AddSessionDialog } from '@/components/school/academic-terms/add-session-dialog';
import { AddTermDialog } from '@/components/school/academic-terms/add-term-dialog';
import { EditSessionDialog } from '@/components/school/academic-terms/edit-session-dialog';
import { EditTermDialog } from '@/components/school/academic-terms/edit-term-dialog';
import {
    termLabel,
    type Session,
    type Stats,
    type Term,
} from '@/components/school/academic-terms/academic-term';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import academicSessions from '@/routes/academic-sessions';
import academicTerms from '@/routes/academic-terms';

export default function AcademicTermsIndex({
    sessions,
    stats,
}: {
    sessions: Session[];
    stats: Stats;
}) {
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [editingTerm, setEditingTerm] = useState<Term | null>(null);
    const [settingCurrent, setSettingCurrent] = useState<Term | null>(null);
    const [processing, setProcessing] = useState(false);

    const confirmSetCurrent = () => {
        if (!settingCurrent) {
            return;
        }

        router.post(
            academicTerms.markCurrent(settingCurrent).url,
            {},
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => {
                    setProcessing(false);
                    setSettingCurrent(null);
                },
            },
        );
    };

    return (
        <>
            <Head title="Academic Terms" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Academic Terms"
                        description="Manage academic sessions and their terms"
                    />

                    <AddSessionDialog />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total Sessions"
                        value={stats.total}
                        icon={CalendarRange}
                    />
                    <StatCard
                        label="Current Term"
                        value={stats.current_term ?? 'Not set'}
                        icon={CalendarRange}
                    />
                </div>

                {sessions.length === 0 && (
                    <div className="border-sidebar-border/70 dark:border-sidebar-border text-muted-foreground rounded-xl border p-6 text-center">
                        No academic sessions yet.
                    </div>
                )}

                {sessions.map((session) => (
                    <DataTableCard
                        key={session.id}
                        title={session.name}
                        icon={CalendarRange}
                        description={`${session.start_date} – ${session.end_date}`}
                        action={
                            <div className="flex items-center gap-2">
                                <AddTermDialog session={session} />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingSession(session)}
                                >
                                    Edit
                                </Button>
                            </div>
                        }
                    >
                        {session.terms.length === 0 ? (
                            <TableEmptyState
                                icon={CalendarRange}
                                title="No terms yet"
                                description="Add a term to this session to get started."
                            />
                        ) : (
                            <DataTable>
                                <THead>
                                    <Th>Term</Th>
                                    <Th>Dates</Th>
                                    <Th align="right">
                                        <span className="sr-only">Actions</span>
                                    </Th>
                                </THead>
                                <TBody>
                                    {session.terms.map((term) => (
                                        <Tr key={term.id}>
                                            <Td className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {termLabel[term.name]}
                                                    {term.is_current && (
                                                        <StatusBadge tone="success">
                                                            Current
                                                        </StatusBadge>
                                                    )}
                                                </div>
                                            </Td>
                                            <Td muted>
                                                {term.start_date} –{' '}
                                                {term.end_date}
                                            </Td>
                                            <Td align="right">
                                                <RowActions
                                                    onEdit={() =>
                                                        setEditingTerm(term)
                                                    }
                                                >
                                                    {!term.is_current && (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                setSettingCurrent(
                                                                    term,
                                                                )
                                                            }
                                                        >
                                                            <CircleCheck />
                                                            Set as current
                                                        </DropdownMenuItem>
                                                    )}
                                                </RowActions>
                                            </Td>
                                        </Tr>
                                    ))}
                                </TBody>
                            </DataTable>
                        )}
                    </DataTableCard>
                ))}
            </div>

            {settingCurrent && (
                <ConfirmDialog
                    open
                    title="Set as current term?"
                    description={`${termLabel[settingCurrent.name]} will become the school's current term. Rosters, attendance and grade entry will switch to it.`}
                    confirmLabel="Set as current"
                    processing={processing}
                    onConfirm={confirmSetCurrent}
                    onCancel={() => setSettingCurrent(null)}
                />
            )}

            {editingSession && (
                <EditSessionDialog
                    session={editingSession}
                    onClose={() => setEditingSession(null)}
                />
            )}

            {editingTerm && (
                <EditTermDialog
                    term={editingTerm}
                    onClose={() => setEditingTerm(null)}
                />
            )}
        </>
    );
}

AcademicTermsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Academic Terms',
            href: academicSessions.index(),
        },
    ],
};
