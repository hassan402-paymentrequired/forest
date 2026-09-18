import { Form, Head, Link, router, setLayoutProps } from '@inertiajs/react';
import { Award, CalendarCheck, TrendingUp, User, Users } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { StatCard } from '@/components/stat-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import academicSessions from '@/routes/academic-sessions';
import classes from '@/routes/classes';
import students from '@/routes/students';

type StudentStatus = 'active' | 'graduated' | 'transferred' | 'withdrawn';

type TeacherOption = {
    id: string;
    name: string;
};

type Teacher = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
};

type RosterStudent = {
    id: string;
    name: string;
    admission_number: string | null;
    status: StudentStatus;
    attendance: {
        present: number;
        absent: number;
        late: number;
        excused: number;
        days_recorded: number;
    };
};

type GradeSummaryEntry = {
    subject: string;
    students_graded: number;
    average: number;
    passing: number;
};

type AttendanceTrendDay = {
    date: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
};

const statusLabel: Record<StudentStatus, string> = {
    active: 'Active',
    graduated: 'Graduated',
    transferred: 'Transferred',
    withdrawn: 'Withdrawn',
};

const statusTone: Record<StudentStatus, Tone> = {
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

function AssignTeacherDialog({
    classId,
    teachers,
    hasTeacher,
}: {
    classId: string;
    teachers: TeacherOption[];
    hasTeacher: boolean;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    {hasTeacher ? 'Change' : 'Assign Teacher'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign class teacher</DialogTitle>
                </DialogHeader>

                <Form
                    {...classes.teacher.store.form(classId)}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="teacher_id">Teacher</Label>
                                <Select name="teacher_id">
                                    <SelectTrigger
                                        id="teacher_id"
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
                                <InputError message={errors.teacher_id} />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Save
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function ClassShow({
    class: schoolClass,
    current_term: hasCurrentTerm,
    teacher,
    teachers,
    roster,
    grade_summary: gradeSummary,
    attendance_trend: attendanceTrend,
    stats,
}: {
    class: { id: string; name: string };
    current_term: boolean;
    teacher: Teacher | null;
    teachers: TeacherOption[];
    roster: RosterStudent[];
    grade_summary: GradeSummaryEntry[];
    attendance_trend: AttendanceTrendDay[];
    stats: { total_students: number; attendance_rate: number | null };
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Classes', href: classes.index() },
            { title: schoolClass.name, href: classes.show(schoolClass.id) },
        ],
    });

    const handleRemoveTeacher = () => {
        if (confirm(`Remove ${teacher?.name} as the class teacher?`)) {
            router.delete(classes.teacher.destroy(schoolClass.id).url);
        }
    };

    return (
        <>
            <Head title={schoolClass.name} />

            <div className="space-y-6 p-4">
                <Heading
                    title={schoolClass.name}
                    description="Class roster, teacher, and attendance for the current term"
                />

                {!hasCurrentTerm && (
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border border-dashed p-4 text-sm">
                        <span className="text-muted-foreground">
                            Set a current academic term to see this class's
                            roster and assign a class teacher.
                        </span>{' '}
                        <Link
                            href={academicSessions.index()}
                            className="font-medium underline underline-offset-4"
                        >
                            Manage academic terms
                        </Link>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard
                        label="Students Enrolled"
                        value={stats.total_students}
                        icon={Users}
                    />
                    <StatCard
                        label="Attendance Rate (Term)"
                        value={
                            stats.attendance_rate !== null
                                ? `${stats.attendance_rate}%`
                                : '—'
                        }
                        icon={CalendarCheck}
                    />
                </div>

                <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <User className="text-muted-foreground size-4" />
                            Class Teacher
                        </CardTitle>
                        {hasCurrentTerm && (
                            <div className="flex items-center gap-2">
                                <AssignTeacherDialog
                                    classId={schoolClass.id}
                                    teachers={teachers}
                                    hasTeacher={teacher !== null}
                                />
                                {teacher && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={handleRemoveTeacher}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        {teacher ? (
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarFallback className="text-xs">
                                        {initials(teacher.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium">
                                        {teacher.name}
                                    </div>
                                    <div className="text-muted-foreground text-sm">
                                        {teacher.email}
                                        {teacher.email && teacher.phone
                                            ? ' · '
                                            : ''}
                                        {teacher.phone}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                No class teacher assigned for the current term.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <DataTableCard
                    title="Roster"
                    icon={Users}
                    count={roster.length}
                    noun="student"
                >
                    {roster.length === 0 ? (
                        <TableEmptyState
                            icon={Users}
                            title="No students enrolled"
                            description={
                                hasCurrentTerm
                                    ? 'No students are enrolled in this class for the current term.'
                                    : 'No current academic term set.'
                            }
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>Name</Th>
                                <Th hideOnMobile>Admission No.</Th>
                                <Th>Status</Th>
                                <Th hideOnMobile>Attendance (Term)</Th>
                            </THead>
                            <TBody>
                                {roster.map((student) => (
                                    <Tr key={student.id}>
                                        <Td className="font-medium">
                                            <Link
                                                href={students.show(student.id)}
                                                className="flex items-center gap-3 hover:underline"
                                            >
                                                <Avatar>
                                                    <AvatarFallback className="text-xs">
                                                        {initials(student.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {student.name}
                                            </Link>
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {student.admission_number ?? '—'}
                                        </Td>
                                        <Td>
                                            <StatusBadge
                                                tone={
                                                    statusTone[student.status]
                                                }
                                            >
                                                {statusLabel[student.status]}
                                            </StatusBadge>
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {student.attendance.days_recorded >
                                            0
                                                ? `${student.attendance.present} present, ${student.attendance.absent} absent, ${student.attendance.late} late, ${student.attendance.excused} excused`
                                                : 'No records yet'}
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </DataTable>
                    )}
                </DataTableCard>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="text-muted-foreground size-4" />
                                Grades by Subject (Term)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-0">
                            {gradeSummary.length === 0 ? (
                                <p className="text-muted-foreground px-6 text-sm">
                                    No grades recorded yet this term.
                                </p>
                            ) : (
                                <DataTable>
                                    <THead>
                                        <Th>Subject</Th>
                                        <Th>Graded</Th>
                                        <Th>Average</Th>
                                        <Th>Passing</Th>
                                    </THead>
                                    <TBody>
                                        {gradeSummary.map((entry) => (
                                            <Tr key={entry.subject}>
                                                <Td>{entry.subject}</Td>
                                                <Td>{entry.students_graded}</Td>
                                                <Td>{entry.average}</Td>
                                                <Td muted>
                                                    {entry.passing}/
                                                    {entry.students_graded}
                                                </Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </DataTable>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="text-muted-foreground size-4" />
                                Attendance Trend (Last 14 Recorded Days)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-0">
                            {attendanceTrend.length === 0 ? (
                                <p className="text-muted-foreground px-6 text-sm">
                                    No attendance recorded yet this term.
                                </p>
                            ) : (
                                <DataTable>
                                    <THead>
                                        <Th>Date</Th>
                                        <Th>Present</Th>
                                        <Th>Absent</Th>
                                        <Th>Rate</Th>
                                    </THead>
                                    <TBody>
                                        {attendanceTrend.map((day) => (
                                            <Tr key={day.date}>
                                                <Td>
                                                    {new Date(
                                                        day.date,
                                                    ).toLocaleDateString(
                                                        undefined,
                                                        {
                                                            month: 'short',
                                                            day: 'numeric',
                                                        },
                                                    )}
                                                </Td>
                                                <Td>{day.present}</Td>
                                                <Td>{day.absent}</Td>
                                                <Td muted>
                                                    {day.total > 0
                                                        ? `${Math.round((day.present / day.total) * 100)}%`
                                                        : '—'}
                                                </Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </DataTable>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
