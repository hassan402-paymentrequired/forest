import { Head, Link, router } from '@inertiajs/react';
import { Award, BookMarked, ClipboardList, TrendingUp } from 'lucide-react';
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
import grades from '@/routes/grades';

const CA_MAX = 40;
const EXAM_MAX = 60;

type SchoolClassOption = {
    id: string;
    name: string;
};

type SubjectOption = {
    id: string;
    name: string;
};

type TeacherOption = {
    id: string;
    name: string;
};

type RosterEntry = {
    student_id: string;
    name: string;
    ca_score: number;
    exam_score: number;
    total: number;
    grade: string | null;
};

type Stats = {
    total: number;
    average: number;
    passing: number;
};

export default function GradesIndex({
    classes,
    subjects,
    teachers,
    roster,
    filters: initialFilters,
    current_term: hasCurrentTerm,
    stats,
}: {
    classes: SchoolClassOption[];
    subjects: SubjectOption[];
    teachers: TeacherOption[];
    roster: RosterEntry[];
    filters: { class_id: string | null; subject_id: string | null };
    current_term: boolean;
    stats: Stats;
}) {
    const [filters, setFilters] = useListFilters(grades.index().url, {
        class_id: initialFilters.class_id ?? '',
        subject_id: initialFilters.subject_id ?? '',
    });
    const [teacherId, setTeacherId] = useState('');
    const [entries, setEntries] = useState<RosterEntry[]>(roster);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEntries(roster);
    }, [roster]);

    const updateScore = (
        studentId: string,
        field: 'ca_score' | 'exam_score',
        value: number,
    ) => {
        setEntries((current) =>
            current.map((entry) =>
                entry.student_id === studentId
                    ? { ...entry, [field]: value }
                    : entry,
            ),
        );
    };

    const handleSave = () => {
        setSaving(true);

        router.post(
            grades.store().url,
            {
                class_id: filters.class_id,
                subject_id: filters.subject_id,
                teacher_id: teacherId || null,
                records: entries.map((entry) => ({
                    student_id: entry.student_id,
                    ca_score: entry.ca_score,
                    exam_score: entry.exam_score,
                })),
            },
            { onFinish: () => setSaving(false) },
        );
    };

    return (
        <>
            <Head title="Grades" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Grades"
                    description="Record subject scores for a class"
                />

                {!hasCurrentTerm && (
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border border-dashed p-4 text-sm">
                        <span className="text-muted-foreground">
                            Set a current academic term before recording grades.
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
                        icon={BookMarked}
                    />
                    <StatCard
                        label="Class Average"
                        value={stats.average}
                        icon={TrendingUp}
                    />
                    <StatCard
                        label="Passing (C and above)"
                        value={stats.passing}
                        icon={Award}
                    />
                </div>

                <DataTableCard
                    title="Class roster"
                    icon={ClipboardList}
                    count={entries.length}
                    noun="student"
                    filters={
                        <FilterBar className="lg:grid-cols-3">
                            <div className="grid gap-1.5">
                                <Label
                                    htmlFor="grade-class"
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
                                        id="grade-class"
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
                                    htmlFor="grade-subject"
                                    className="text-muted-foreground text-xs"
                                >
                                    Subject
                                </Label>
                                <Select
                                    value={filters.subject_id || undefined}
                                    onValueChange={(value) =>
                                        setFilters((current) => ({
                                            ...current,
                                            subject_id: value,
                                        }))
                                    }
                                    disabled={!hasCurrentTerm}
                                >
                                    <SelectTrigger
                                        id="grade-subject"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Select a subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((subject) => (
                                            <SelectItem
                                                key={subject.id}
                                                value={subject.id}
                                            >
                                                {subject.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label
                                    htmlFor="grade-teacher"
                                    className="text-muted-foreground text-xs"
                                >
                                    Teacher (optional)
                                </Label>
                                <Select
                                    value={teacherId || undefined}
                                    onValueChange={setTeacherId}
                                    disabled={!hasCurrentTerm}
                                >
                                    <SelectTrigger
                                        id="grade-teacher"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Select a teacher" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teachers.map((teacher) => (
                                            <SelectItem
                                                key={teacher.id}
                                                value={teacher.id}
                                            >
                                                {teacher.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </FilterBar>
                    }
                >
                    {!filters.class_id || !filters.subject_id ? (
                        <TableEmptyState
                            icon={ClipboardList}
                            title="Select a class and subject"
                            description="Choose a class and subject above to record grades."
                        />
                    ) : entries.length === 0 ? (
                        <TableEmptyState
                            icon={ClipboardList}
                            title="No students enrolled"
                            description="No students are enrolled in this class for the current session."
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>Student</Th>
                                <Th>CA ({CA_MAX})</Th>
                                <Th>Exam ({EXAM_MAX})</Th>
                                <Th>Total</Th>
                                <Th>Grade</Th>
                            </THead>
                            <TBody>
                                {entries.map((entry) => {
                                    const total =
                                        entry.ca_score + entry.exam_score;

                                    return (
                                        <Tr key={entry.student_id}>
                                            <Td className="font-medium">
                                                {entry.name}
                                            </Td>
                                            <Td>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={CA_MAX}
                                                    className="w-20"
                                                    value={entry.ca_score}
                                                    onChange={(event) =>
                                                        updateScore(
                                                            entry.student_id,
                                                            'ca_score',
                                                            Number(
                                                                event.target
                                                                    .value,
                                                            ),
                                                        )
                                                    }
                                                />
                                            </Td>
                                            <Td>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={EXAM_MAX}
                                                    className="w-20"
                                                    value={entry.exam_score}
                                                    onChange={(event) =>
                                                        updateScore(
                                                            entry.student_id,
                                                            'exam_score',
                                                            Number(
                                                                event.target
                                                                    .value,
                                                            ),
                                                        )
                                                    }
                                                />
                                            </Td>
                                            <Td muted className="tabular-nums">
                                                {total}
                                            </Td>
                                            <Td muted className="uppercase">
                                                {total >= 70
                                                    ? 'A'
                                                    : total >= 60
                                                      ? 'B'
                                                      : total >= 50
                                                        ? 'C'
                                                        : total >= 40
                                                          ? 'D'
                                                          : 'F'}
                                            </Td>
                                        </Tr>
                                    );
                                })}
                            </TBody>
                        </DataTable>
                    )}

                    {entries.length > 0 && (
                        <div className="flex justify-end border-t p-4">
                            <Button onClick={handleSave} disabled={saving}>
                                Save Grades
                            </Button>
                        </div>
                    )}
                </DataTableCard>
            </div>
        </>
    );
}

GradesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Grades',
            href: grades.index(),
        },
    ],
};
