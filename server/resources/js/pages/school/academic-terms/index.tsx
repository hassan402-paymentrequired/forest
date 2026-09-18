import { Head, router } from '@inertiajs/react';
import {
    CalendarRange,
    CircleCheck,
    MoreHorizontal,
    Pencil,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import {
    DataTable,
    DataTableCard,
    StatusBadge,
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import academicSessions from '@/routes/academic-sessions';
import academicTerms from '@/routes/academic-terms';
import AddSessionDialog from '../components/add-section-dialog';
import EditSessionDialog from '../components/edit-section-dialog';
import EditTermDialog from '../components/edit-term-dialog';
import AddTermDialog from '../components/add-term-dialog';

type TermName = 'first_term' | 'second_term' | 'third_term';

export type Term = {
    id: string;
    name: TermName;
    start_date: string;
    end_date: string;
    is_current: boolean;
};

export type Session = {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    terms: Term[];
};

export type Stats = {
    total: number;
    current_term: string | null;
};

export const termLabel: Record<TermName, string> = {
    first_term: 'First Term',
    second_term: 'Second Term',
    third_term: 'Third Term',
};

export default function AcademicTermsIndex({
    sessions,
    stats,
}: {
    sessions: Session[];
    stats: Stats;
}) {
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [editingTerm, setEditingTerm] = useState<Term | null>(null);

    const handleDeleteSession = (session: Session) => {
        if (
            confirm(
                `Remove ${session.name} and all of its terms? This cannot be undone.`,
            )
        ) {
            router.delete(academicSessions.destroy(session).url);
        }
    };

    const handleDeleteTerm = (term: Term) => {
        if (confirm(`Remove ${termLabel[term.name]}?`)) {
            router.delete(academicTerms.destroy(term).url);
        }
    };

    const handleMarkCurrent = (term: Term) => {
        router.post(academicTerms.markCurrent(term).url);
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
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteSession(session)}
                                >
                                    Remove
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
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8"
                                                        >
                                                            <MoreHorizontal className="size-4" />
                                                            <span className="sr-only">
                                                                Open menu
                                                            </span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {!term.is_current && (
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handleMarkCurrent(
                                                                        term,
                                                                    )
                                                                }
                                                            >
                                                                <CircleCheck />
                                                                Set Current
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                setEditingTerm(
                                                                    term,
                                                                )
                                                            }
                                                        >
                                                            <Pencil />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            onClick={() =>
                                                                handleDeleteTerm(
                                                                    term,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 />
                                                            Remove
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </Td>
                                        </Tr>
                                    ))}
                                </TBody>
                            </DataTable>
                        )}
                    </DataTableCard>
                ))}
            </div>

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
