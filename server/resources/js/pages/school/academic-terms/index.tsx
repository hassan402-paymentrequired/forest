import { Head, router } from '@inertiajs/react';
import { CalendarRange, Plus } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
                    <div
                        key={session.id}
                        className="border-sidebar-border/70 dark:border-sidebar-border overflow-hidden rounded-xl border"
                    >
                        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="font-xl font-semibold">
                                    {session.name}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                    {session.start_date} – {session.end_date}
                                </div>
                            </div>
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
                        </div>

                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium">
                                        Term
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Dates
                                    </th>
                                    <th className="px-4 py-3 font-medium" />
                                    <th className="px-4 py-3 font-medium" />
                                </tr>
                            </thead>
                            <tbody className="divide-border divide-y">
                                {session.terms.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="text-muted-foreground px-4 py-6 text-center"
                                        >
                                            No terms yet.
                                        </td>
                                    </tr>
                                )}

                                {session.terms.map((term) => (
                                    <tr key={term.id}>
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex items-center gap-2">
                                                {termLabel[term.name]}
                                                {term.is_current && (
                                                    <Badge>Current</Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {term.start_date} – {term.end_date}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {!term.is_current && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleMarkCurrent(term)
                                                    }
                                                >
                                                    Set Current
                                                </Button>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setEditingTerm(term)
                                                }
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() =>
                                                    handleDeleteTerm(term)
                                                }
                                            >
                                                Remove
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
