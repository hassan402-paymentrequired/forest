import { Head, Link, router } from '@inertiajs/react';
import { Award, BookMarked, TrendingUp } from 'lucide-react';
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

                <div className="border-sidebar-border/70 dark:border-sidebar-border overflow-hidden rounded-xl border">
                    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
                        <div className="grid gap-2 sm:w-56">
                            <Label htmlFor="grade-class">Class</Label>
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
                        <div className="grid gap-2 sm:w-56">
                            <Label htmlFor="grade-subject">Subject</Label>
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
                        <div className="grid gap-2 sm:w-56">
                            <Label htmlFor="grade-teacher">
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
                    </div>

                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium">
                                    Student
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    CA ({CA_MAX})
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Exam ({EXAM_MAX})
                                </th>
                                <th className="px-4 py-3 font-medium">Total</th>
                                <th className="px-4 py-3 font-medium">Grade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                            {(!filters.class_id || !filters.subject_id) && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-muted-foreground px-4 py-6 text-center"
                                    >
                                        Select a class and subject to record
                                        grades.
                                    </td>
                                </tr>
                            )}

                            {filters.class_id &&
                                filters.subject_id &&
                                entries.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="text-muted-foreground px-4 py-6 text-center"
                                        >
                                            No students enrolled in this class
                                            for the current session.
                                        </td>
                                    </tr>
                                )}

                            {entries.map((entry) => {
                                const total = entry.ca_score + entry.exam_score;

                                return (
                                    <tr key={entry.student_id}>
                                        <td className="px-4 py-3 font-medium">
                                            {entry.name}
                                        </td>
                                        <td className="px-4 py-3">
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
                                                            event.target.value,
                                                        ),
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-3">
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
                                                            event.target.value,
                                                        ),
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className="text-muted-foreground px-4 py-3">
                                            {total}
                                        </td>
                                        <td className="text-muted-foreground px-4 py-3 uppercase">
                                            {total >= 70
                                                ? 'A'
                                                : total >= 60
                                                  ? 'B'
                                                  : total >= 50
                                                    ? 'C'
                                                    : total >= 40
                                                      ? 'D'
                                                      : 'F'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {entries.length > 0 && (
                        <div className="flex justify-end border-t p-4">
                            <Button onClick={handleSave} disabled={saving}>
                                Save Grades
                            </Button>
                        </div>
                    )}
                </div>
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
