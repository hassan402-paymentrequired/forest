import { Head, Link, router } from '@inertiajs/react';
import { CalendarCheck2, Clock, UserCheck, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import Heading from '@/components/heading';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
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
import academicSessions from '@/routes/academic-sessions';
import attendance from '@/routes/attendance';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

type SchoolClassOption = {
    id: string;
    name: string;
};

type RosterEntry = {
    student_id: string;
    name: string;
    status: AttendanceStatus;
};

type Stats = {
    total: number;
    present: number;
    absent: number;
    late: number;
};

const statusLabel: Record<AttendanceStatus, string> = {
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    excused: 'Excused',
};

export default function AttendanceIndex({
    classes,
    roster,
    filters: initialFilters,
    current_term: hasCurrentTerm,
    stats,
}: {
    classes: SchoolClassOption[];
    roster: RosterEntry[];
    filters: { class_id: string | null; date: string };
    current_term: boolean;
    stats: Stats;
}) {
    const [filters, setFilters] = useListFilters(attendance.index().url, {
        class_id: initialFilters.class_id ?? '',
        date: initialFilters.date,
    });
    const [entries, setEntries] = useState<RosterEntry[]>(roster);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEntries(roster);
    }, [roster]);

    const updateStatus = (studentId: string, status: AttendanceStatus) => {
        setEntries((current) =>
            current.map((entry) =>
                entry.student_id === studentId ? { ...entry, status } : entry,
            ),
        );
    };

    const handleSave = () => {
        setSaving(true);

        router.post(
            attendance.store().url,
            {
                class_id: filters.class_id,
                date: filters.date,
                records: entries.map((entry) => ({
                    student_id: entry.student_id,
                    status: entry.status,
                })),
            },
            { onFinish: () => setSaving(false) },
        );
    };

    return (
        <>
            <Head title="Attendance" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Attendance"
                    description="Mark daily attendance for a class"
                />

                {!hasCurrentTerm && (
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border border-dashed p-4 text-sm">
                        <span className="text-muted-foreground">
                            Set a current academic term before taking
                            attendance.
                        </span>{' '}
                        <Link
                            href={academicSessions.index()}
                            className="font-medium underline underline-offset-4"
                        >
                            Manage academic terms
                        </Link>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Roster Size"
                        value={stats.total}
                        icon={CalendarCheck2}
                    />
                    <StatCard
                        label="Present"
                        value={stats.present}
                        icon={UserCheck}
                    />
                    <StatCard
                        label="Absent"
                        value={stats.absent}
                        icon={UserX}
                    />
                    <StatCard label="Late" value={stats.late} icon={Clock} />
                </div>

                <div className="border-sidebar-border/70 dark:border-sidebar-border overflow-hidden rounded-xl border">
                    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
                        <div className="grid gap-2 sm:w-56">
                            <Label htmlFor="attendance-class">Class</Label>
                            <Select
                                value={filters.class_id || undefined}
                                onValueChange={(value) =>
                                    setFilters((current) => ({
                                        ...current,
                                        class_id: value,
                                    }))
                                }
                                disabled={!hasCurrentTerm}
                            >
                                <SelectTrigger
                                    id="attendance-class"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="Select a class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((schoolClass) => (
                                        <SelectItem
                                            key={schoolClass.id}
                                            value={schoolClass.id}
                                        >
                                            {schoolClass.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2 sm:w-48">
                            <Label htmlFor="attendance-date">Date</Label>
                            <Input
                                id="attendance-date"
                                type="date"
                                value={filters.date}
                                max={new Date().toISOString().split('T')[0]}
                                disabled={!hasCurrentTerm}
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        date: event.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>

                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium">
                                    Student
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                            {!filters.class_id && (
                                <tr>
                                    <td
                                        colSpan={2}
                                        className="text-muted-foreground px-4 py-6 text-center"
                                    >
                                        Select a class to take attendance.
                                    </td>
                                </tr>
                            )}

                            {filters.class_id && entries.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={2}
                                        className="text-muted-foreground px-4 py-6 text-center"
                                    >
                                        No students enrolled in this class for
                                        the current session.
                                    </td>
                                </tr>
                            )}

                            {entries.map((entry) => (
                                <tr key={entry.student_id}>
                                    <td className="px-4 py-3 font-medium">
                                        {entry.name}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Select
                                            value={entry.status}
                                            onValueChange={(value) =>
                                                updateStatus(
                                                    entry.student_id,
                                                    value as AttendanceStatus,
                                                )
                                            }
                                        >
                                            <SelectTrigger className="w-40">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(
                                                    statusLabel,
                                                ).map(([value, label]) => (
                                                    <SelectItem
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {entries.length > 0 && (
                        <div className="flex justify-end border-t p-4">
                            <Button onClick={handleSave} disabled={saving}>
                                Save Attendance
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

AttendanceIndex.layout = {
    breadcrumbs: [
        {
            title: 'Attendance',
            href: attendance.index(),
        },
    ],
};
