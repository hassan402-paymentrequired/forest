import { Head, Link, router } from '@inertiajs/react';
import { CalendarCheck2, Clock, UserCheck, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import Heading from '@/components/heading';
import {
    DataTable,
    DataTableCard,
    FilterBar,
    TBody,
    TableEmptyState,
    THead,
    Td,
    Th,
    Tr,
} from '@/components/data-table';
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

                <DataTableCard
                    title="Class roster"
                    icon={CalendarCheck2}
                    count={entries.length}
                    noun="student"
                    filters={
                        <FilterBar className="lg:grid-cols-4">
                            <div className="grid gap-1.5">
                                <Label
                                    htmlFor="attendance-class"
                                    className="text-muted-foreground text-xs"
                                >
                                    Class
                                </Label>
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
                            <div className="grid gap-1.5">
                                <Label
                                    htmlFor="attendance-date"
                                    className="text-muted-foreground text-xs"
                                >
                                    Date
                                </Label>
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
                        </FilterBar>
                    }
                >
                    {!filters.class_id ? (
                        <TableEmptyState
                            icon={CalendarCheck2}
                            title="Select a class"
                            description="Choose a class above to take attendance."
                        />
                    ) : entries.length === 0 ? (
                        <TableEmptyState
                            icon={CalendarCheck2}
                            title="No students enrolled"
                            description="No students are enrolled in this class for the current session."
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>Student</Th>
                                <Th align="right">Status</Th>
                            </THead>
                            <TBody>
                                {entries.map((entry) => (
                                    <Tr key={entry.student_id}>
                                        <Td className="font-medium">
                                            {entry.name}
                                        </Td>
                                        <Td align="right">
                                            <Select
                                                value={entry.status}
                                                onValueChange={(value) =>
                                                    updateStatus(
                                                        entry.student_id,
                                                        value as AttendanceStatus,
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="ml-auto w-40">
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
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </DataTable>
                    )}

                    {entries.length > 0 && (
                        <div className="flex justify-end border-t p-4">
                            <Button onClick={handleSave} disabled={saving}>
                                Save Attendance
                            </Button>
                        </div>
                    )}
                </DataTableCard>
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
