import { Head, Link } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import {
    Award,
    BookOpen,
    CalendarCheck,
    ClipboardCheck,
    GraduationCap,
    School,
    TrendingUp,
    UserPlus,
    Users,
} from 'lucide-react';
import { StatusBadge } from '@/components/data-table';
import { termLabel } from '@/components/school/academic-terms/academic-term';
import type { TermName } from '@/components/school/academic-terms/academic-term';
import { Bar, Empty, Section } from '@/components/section';
import { StatCard } from '@/components/stat-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import academicSessions from '@/routes/academic-sessions';
import attendance from '@/routes/attendance';
import classes from '@/routes/classes';
import grades from '@/routes/grades';
import guardians from '@/routes/guardians';
import school from '@/routes/school';
import students from '@/routes/students';
import teachers from '@/routes/teachers';

type Props = {
    school_name: string;
    term: {
        name: TermName;
        session_name: string;
        start_date: string;
        end_date: string;
    } | null;
    stats: {
        students: number;
        teachers: number;
        guardians: number;
        classes: number;
    };
    attendance: {
        today: number | null;
        term: number | null;
        trend: { date: string; rate: number }[];
    };
    grades: {
        recorded: number;
        average: number | null;
        pass_rate: number | null;
    };
    class_performance: { id: string; name: string; average: number }[];
    teachers_on_leave: { id: string; name: string }[];
    recent_students: {
        id: string;
        name: string;
        admission_number: string | null;
        added_at: string;
    }[];
};

const percent = (value: number | null) => (value === null ? '—' : `${value}%`);

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

export default function SchoolDashboard({
    school_name: schoolName,
    term,
    stats,
    attendance: attendanceSummary,
    grades: gradeSummary,
    class_performance: classPerformance,
    teachers_on_leave: teachersOnLeave,
    recent_students: recentStudents,
}: Props) {
    return (
        <>
            <Head title="Dashboard" />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold tracking-tight">
                            {schoolName}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            {term
                                ? `${termLabel[term.name]} · ${term.session_name} · ${format(parseISO(term.start_date), 'd MMM')} – ${format(parseISO(term.end_date), 'd MMM yyyy')}`
                                : 'No current term is set'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={attendance.index()}>
                                <ClipboardCheck />
                                Take attendance
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={grades.index()}>
                                <BookOpen />
                                Record grades
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={students.index()}>
                                <UserPlus />
                                Add student
                            </Link>
                        </Button>
                    </div>
                </div>

                {!term && (
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border border-dashed p-4 text-sm">
                        <span className="text-muted-foreground">
                            Set a current academic term to unlock class rosters,
                            attendance and grade entry.
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
                    <Link href={students.index()}>
                        <StatCard
                            label="Active students"
                            value={stats.students}
                            icon={Users}
                        />
                    </Link>
                    <Link href={teachers.index()}>
                        <StatCard
                            label="Active teachers"
                            value={stats.teachers}
                            icon={GraduationCap}
                        />
                    </Link>
                    <Link href={guardians.index()}>
                        <StatCard
                            label="Active guardians"
                            value={stats.guardians}
                            icon={Users}
                        />
                    </Link>
                    <Link href={classes.index()}>
                        <StatCard
                            label="Active classes"
                            value={stats.classes}
                            icon={School}
                        />
                    </Link>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Section
                        title="Attendance"
                        icon={CalendarCheck}
                        action={
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={attendance.index()}>Open</Link>
                            </Button>
                        }
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-2xl font-semibold tabular-nums">
                                    {percent(attendanceSummary.today)}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Present today
                                </p>
                            </div>
                            <div>
                                <p className="text-2xl font-semibold tabular-nums">
                                    {percent(attendanceSummary.term)}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Present this term
                                </p>
                            </div>
                        </div>

                        <div className="mt-6">
                            {attendanceSummary.trend.length === 0 ? (
                                <Empty>
                                    No attendance recorded this term yet.
                                </Empty>
                            ) : (
                                <>
                                    <p className="text-muted-foreground mb-2 text-xs">
                                        Last {attendanceSummary.trend.length}{' '}
                                        recorded days
                                    </p>
                                    <div className="flex h-24 items-end gap-2">
                                        {attendanceSummary.trend.map((day) => (
                                            <div
                                                key={day.date}
                                                className="flex flex-1 flex-col items-center gap-1"
                                                title={`${format(parseISO(day.date), 'd MMM')}: ${day.rate}% present`}
                                            >
                                                <div className="bg-muted flex h-full w-full items-end overflow-hidden rounded-sm">
                                                    <div
                                                        className="w-full bg-emerald-500"
                                                        style={{
                                                            height: `${day.rate}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-muted-foreground text-[10px]">
                                                    {format(
                                                        parseISO(day.date),
                                                        'd/M',
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </Section>

                    <Section
                        title="Grades this term"
                        icon={TrendingUp}
                        action={
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={grades.index()}>Open</Link>
                            </Button>
                        }
                    >
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-2xl font-semibold tabular-nums">
                                    {gradeSummary.recorded}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Grades recorded
                                </p>
                            </div>
                            <div>
                                <p className="text-2xl font-semibold tabular-nums">
                                    {gradeSummary.average ?? '—'}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Average score
                                </p>
                            </div>
                            <div>
                                <p className="text-2xl font-semibold tabular-nums">
                                    {percent(gradeSummary.pass_rate)}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Pass rate
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            <p className="text-muted-foreground text-xs">
                                Class averages
                            </p>
                            {classPerformance.length === 0 ? (
                                <Empty>No grades recorded this term yet.</Empty>
                            ) : (
                                classPerformance.slice(0, 6).map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center gap-3 text-sm"
                                    >
                                        <Link
                                            href={classes.show(entry.id)}
                                            className="w-24 shrink-0 truncate hover:underline"
                                        >
                                            {entry.name}
                                        </Link>
                                        <Bar
                                            value={entry.average}
                                            className={
                                                entry.average >= 50
                                                    ? 'bg-emerald-500'
                                                    : 'bg-red-500'
                                            }
                                        />
                                        <span className="w-10 text-right tabular-nums">
                                            {entry.average}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </Section>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Section
                        title="Recently added students"
                        icon={UserPlus}
                        action={
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={students.index()}>View all</Link>
                            </Button>
                        }
                    >
                        {recentStudents.length === 0 ? (
                            <Empty>No students yet.</Empty>
                        ) : (
                            <ul className="divide-border divide-y">
                                {recentStudents.map((student) => (
                                    <li
                                        key={student.id}
                                        className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                                    >
                                        <Link
                                            href={students.show(student.id)}
                                            className="flex items-center gap-3 hover:underline"
                                        >
                                            <Avatar className="size-8">
                                                <AvatarFallback className="text-xs">
                                                    {initials(student.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="text-sm">
                                                <div className="font-medium">
                                                    {student.name}
                                                </div>
                                                <div className="text-muted-foreground text-xs">
                                                    {student.admission_number ??
                                                        'No admission number'}
                                                </div>
                                            </div>
                                        </Link>
                                        <span className="text-muted-foreground text-xs">
                                            {format(
                                                parseISO(student.added_at),
                                                'd MMM yyyy',
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>

                    <Section
                        title="Teachers on leave"
                        icon={Award}
                        action={
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={teachers.index()}>View all</Link>
                            </Button>
                        }
                    >
                        {teachersOnLeave.length === 0 ? (
                            <Empty>Nobody is on leave right now.</Empty>
                        ) : (
                            <ul className="divide-border divide-y">
                                {teachersOnLeave.map((teacher) => (
                                    <li
                                        key={teacher.id}
                                        className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                                    >
                                        <Link
                                            href={teachers.show(teacher.id)}
                                            className="text-sm font-medium hover:underline"
                                        >
                                            {teacher.name}
                                        </Link>
                                        <StatusBadge tone="warning">
                                            On leave
                                        </StatusBadge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>
                </div>
            </div>
        </>
    );
}

SchoolDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: school.dashboard(),
        },
    ],
};
