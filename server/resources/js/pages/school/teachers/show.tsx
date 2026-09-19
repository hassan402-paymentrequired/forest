import { Head, Link, setLayoutProps } from '@inertiajs/react';
import {
    differenceInCalendarDays,
    format,
    formatDistanceToNowStrict,
    parseISO,
} from 'date-fns';
import {
    Award,
    BookOpen,
    CalendarDays,
    GraduationCap,
    Mail,
    Pencil,
    Phone,
    TrendingUp,
    UserCheck,
    UserX,
    Users,
} from 'lucide-react';
import { useState } from 'react';
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
    type Tone,
} from '@/components/data-table';
import { EditTeacherDialog } from '@/components/school/teachers/edit-teacher-dialog';
import { statusLabel, statusTone } from '@/components/school/teachers/teacher';
import type {
    SubjectOption,
    Teacher,
} from '@/components/school/teachers/teacher';
import { ToggleTeacherStatusDialog } from '@/components/school/teachers/toggle-teacher-status-dialog';
import { StatCard } from '@/components/stat-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import classes from '@/routes/classes';
import students from '@/routes/students';
import subjects from '@/routes/subjects';
import teachers from '@/routes/teachers';
import { termLabel } from '@/components/school/academic-terms/academic-term';

type TermName = 'first_term' | 'second_term' | 'third_term';
type StudentStatus = 'active' | 'graduated' | 'transferred' | 'withdrawn';

type ClassAssignment = {
    id: string;
    class: { id: string; name: string };
    term_name: TermName;
    session_name: string;
    is_current: boolean;
};

type StudentInCharge = {
    id: string;
    name: string;
    admission_number: string | null;
    class_name: string;
    status: StudentStatus;
};

type GradeTerm = {
    term_id: string;
    term_name: TermName;
    session_name: string;
    is_current: boolean;
    average: number;
    entries: {
        subject: string;
        class: string;
        students_graded: number;
        average: number;
        pass_rate: number;
    }[];
};

type Stats = {
    subjects: number;
    students: number;
    grades_recorded: number;
    average: number | null;
    pass_rate: number | null;
};

const studentStatusLabel: Record<StudentStatus, string> = {
    active: 'Active',
    graduated: 'Graduated',
    transferred: 'Transferred',
    withdrawn: 'Withdrawn',
};

const studentStatusTone: Record<StudentStatus, Tone> = {
    active: 'success',
    graduated: 'info',
    transferred: 'warning',
    withdrawn: 'danger',
};

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

function ScoreBar({ value }: { value: number }) {
    return (
        <div className="flex items-center gap-2">
            <div className="bg-muted h-1.5 w-20 overflow-hidden rounded-full">
                <div
                    className={cn(
                        'h-full rounded-full',
                        value >= 50 ? 'bg-emerald-500' : 'bg-red-500',
                    )}
                    style={{ width: `${Math.min(value, 100)}%` }}
                />
            </div>
            <span className="tabular-nums">{value}</span>
        </div>
    );
}

function ProfileRow({
    icon: Icon,
    label,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
                <Icon className="size-4" />
            </div>
            <div className="min-w-0">
                <p className="text-muted-foreground text-xs">{label}</p>
                <div className="text-sm font-medium wrap-break-word">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function TeacherShow({
    teacher,
    subjects: subjectOptions,
    class_assignments: classAssignments,
    students: studentsInCharge,
    grades_by_term: gradesByTerm,
    stats,
}: {
    teacher: Teacher;
    subjects: SubjectOption[];
    class_assignments: ClassAssignment[];
    students: StudentInCharge[];
    grades_by_term: GradeTerm[];
    stats: Stats;
}) {
    const [editing, setEditing] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);

    setLayoutProps({
        breadcrumbs: [
            { title: 'Teachers', href: teachers.index() },
            { title: teacher.name, href: teachers.show(teacher.id) },
        ],
    });

    const joinedAt = teacher.joined_at ? parseISO(teacher.joined_at) : null;
    const showTenure =
        joinedAt !== null &&
        differenceInCalendarDays(new Date(), joinedAt) > 30;
    const isActive = teacher.status === 'active';

    return (
        <>
            <Head title={teacher.name} />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="size-14">
                            <AvatarFallback className="text-base">
                                {initials(teacher.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-semibold tracking-tight">
                                    {teacher.name}
                                </h2>
                                <StatusBadge tone={statusTone[teacher.status]}>
                                    {statusLabel[teacher.status]}
                                </StatusBadge>
                            </div>
                            <p className="text-muted-foreground text-sm">
                                {teacher.subjects.length > 0
                                    ? teacher.subjects
                                          .map((subject) => subject.name)
                                          .join(', ')
                                    : 'No subjects assigned'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setEditing(true)}
                        >
                            <Pencil />
                            Edit
                        </Button>
                        <Button
                            variant="outline"
                            className={cn(
                                isActive &&
                                    'text-destructive hover:text-destructive',
                            )}
                            onClick={() => setTogglingStatus(true)}
                        >
                            {isActive ? <UserX /> : <UserCheck />}
                            {isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Subjects"
                        value={stats.subjects}
                        icon={BookOpen}
                    />
                    <StatCard
                        label="Students in their class"
                        value={stats.students}
                        icon={Users}
                    />
                    <StatCard
                        label="Average score"
                        value={stats.average ?? '—'}
                        icon={TrendingUp}
                    />
                    <StatCard
                        label="Pass rate"
                        value={
                            stats.pass_rate !== null
                                ? `${stats.pass_rate}%`
                                : '—'
                        }
                        icon={Award}
                    />
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ProfileRow icon={Mail} label="Email">
                                {teacher.email ? (
                                    <a
                                        href={`mailto:${teacher.email}`}
                                        className="hover:underline"
                                    >
                                        {teacher.email}
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground font-normal">
                                        Not provided
                                    </span>
                                )}
                            </ProfileRow>
                            <ProfileRow icon={Phone} label="Phone">
                                {teacher.phone ? (
                                    <a
                                        href={`tel:${teacher.phone}`}
                                        className="hover:underline"
                                    >
                                        {teacher.phone}
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground font-normal">
                                        Not provided
                                    </span>
                                )}
                            </ProfileRow>
                            <ProfileRow icon={CalendarDays} label="Joined">
                                {joinedAt ? (
                                    <>
                                        {format(joinedAt, 'd MMM yyyy')}
                                        {showTenure && (
                                            <span className="text-muted-foreground font-normal">
                                                {' '}
                                                ·{' '}
                                                {formatDistanceToNowStrict(
                                                    joinedAt,
                                                )}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-muted-foreground font-normal">
                                        Not recorded
                                    </span>
                                )}
                            </ProfileRow>
                            <ProfileRow
                                icon={GraduationCap}
                                label="Class teacher of (this term)"
                            >
                                {teacher.classes.length > 0 ? (
                                    <span className="flex flex-wrap gap-x-2">
                                        {teacher.classes.map((schoolClass) => (
                                            <Link
                                                key={schoolClass.id}
                                                href={classes.show(
                                                    schoolClass.id,
                                                )}
                                                className="hover:underline"
                                            >
                                                {schoolClass.name}
                                            </Link>
                                        ))}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground font-normal">
                                        None
                                    </span>
                                )}
                            </ProfileRow>
                        </CardContent>
                    </Card>

                    <div className="space-y-6 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="text-muted-foreground size-4" />
                                    Subjects
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {teacher.subjects.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">
                                        No subjects assigned yet. Use Edit to
                                        add some.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {teacher.subjects.map((subject) => (
                                            <Link
                                                key={subject.id}
                                                href={subjects.show(subject.id)}
                                            >
                                                <Badge
                                                    variant="outline"
                                                    className="hover:bg-accent px-2.5 py-1 text-sm"
                                                >
                                                    {subject.name}
                                                </Badge>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GraduationCap className="text-muted-foreground size-4" />
                                    Class assignments
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {classAssignments.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">
                                        Not assigned as a class teacher yet.
                                    </p>
                                ) : (
                                    <ul className="divide-border divide-y text-sm">
                                        {classAssignments.map((assignment) => (
                                            <li
                                                key={assignment.id}
                                                className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                                            >
                                                <Link
                                                    href={classes.show(
                                                        assignment.class.id,
                                                    )}
                                                    className="font-medium hover:underline"
                                                >
                                                    {assignment.class.name}
                                                </Link>
                                                <span className="text-muted-foreground flex items-center gap-2">
                                                    {
                                                        termLabel[
                                                            assignment.term_name
                                                        ]
                                                    }{' '}
                                                    ({assignment.session_name})
                                                    {assignment.is_current && (
                                                        <Badge variant="secondary">
                                                            Current
                                                        </Badge>
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <DataTableCard
                    title="Students in their class"
                    description="Students enrolled in the classes they're in charge of this term"
                    icon={Users}
                    count={studentsInCharge.length}
                    noun="student"
                >
                    {studentsInCharge.length === 0 ? (
                        <TableEmptyState
                            icon={Users}
                            title="No students yet"
                            description={
                                teacher.classes.length === 0
                                    ? 'Assign this teacher as a class teacher to see their students here.'
                                    : 'No students are enrolled in their class this session.'
                            }
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>Student</Th>
                                <Th>Admission no.</Th>
                                <Th>Class</Th>
                                <Th>Status</Th>
                            </THead>
                            <TBody>
                                {studentsInCharge.map((student) => (
                                    <Tr key={student.id}>
                                        <Td className="font-medium">
                                            <Link
                                                href={students.show(student.id)}
                                                className="flex items-center gap-3 hover:underline"
                                            >
                                                <Avatar className="size-8">
                                                    <AvatarFallback className="text-xs">
                                                        {initials(student.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {student.name}
                                            </Link>
                                        </Td>
                                        <Td muted>
                                            {student.admission_number ?? '—'}
                                        </Td>
                                        <Td muted>{student.class_name}</Td>
                                        <Td>
                                            <StatusBadge
                                                tone={
                                                    studentStatusTone[
                                                        student.status
                                                    ]
                                                }
                                            >
                                                {
                                                    studentStatusLabel[
                                                        student.status
                                                    ]
                                                }
                                            </StatusBadge>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </DataTable>
                    )}
                </DataTableCard>

                <DataTableCard
                    title="Grades recorded"
                    description="Scores this teacher has entered, by term"
                    icon={BookOpen}
                    count={stats.grades_recorded}
                    noun="grade"
                >
                    {gradesByTerm.length === 0 ? (
                        <TableEmptyState
                            icon={BookOpen}
                            title="No grades recorded yet"
                            description="Grades entered by this teacher will be summarised here."
                        />
                    ) : (
                        <div className="divide-border divide-y">
                            {gradesByTerm.map((term) => (
                                <div key={term.term_id}>
                                    <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 px-6 py-2.5 text-sm">
                                        <span className="flex items-center gap-2 font-medium">
                                            {termLabel[term.term_name]} (
                                            {term.session_name})
                                            {term.is_current && (
                                                <Badge variant="secondary">
                                                    Current
                                                </Badge>
                                            )}
                                        </span>
                                        <span className="text-muted-foreground">
                                            Term average{' '}
                                            <span className="text-foreground font-medium tabular-nums">
                                                {term.average}
                                            </span>
                                        </span>
                                    </div>
                                    <DataTable>
                                        <THead>
                                            <Th>Subject</Th>
                                            <Th>Class</Th>
                                            <Th>Students graded</Th>
                                            <Th>Average</Th>
                                            <Th>Pass rate</Th>
                                        </THead>
                                        <TBody>
                                            {term.entries.map((entry) => (
                                                <Tr
                                                    key={`${entry.subject}-${entry.class}`}
                                                >
                                                    <Td className="font-medium">
                                                        {entry.subject}
                                                    </Td>
                                                    <Td muted>{entry.class}</Td>
                                                    <Td className="tabular-nums">
                                                        {entry.students_graded}
                                                    </Td>
                                                    <Td>
                                                        <ScoreBar
                                                            value={
                                                                entry.average
                                                            }
                                                        />
                                                    </Td>
                                                    <Td className="tabular-nums">
                                                        {entry.pass_rate}%
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </DataTable>
                                </div>
                            ))}
                        </div>
                    )}
                </DataTableCard>
            </div>

            {editing && (
                <EditTeacherDialog
                    teacher={teacher}
                    subjects={subjectOptions}
                    onClose={() => setEditing(false)}
                />
            )}

            <ToggleTeacherStatusDialog
                teacher={togglingStatus ? teacher : null}
                onClose={() => setTogglingStatus(false)}
            />
        </>
    );
}
