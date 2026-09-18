import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { CalendarCheck, GraduationCap, ShieldCheck, User } from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, TBody, THead, Td, Th, Tr } from '@/components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import students from '@/routes/students';
import { termLabel } from '../academic-terms';
import { GuardiansCard } from '../components/guardian-card';

type StudentStatus = 'active' | 'graduated' | 'transferred' | 'withdrawn';
type TermName = 'first_term' | 'second_term' | 'third_term';
type GuardianRelationship = 'father' | 'mother' | 'guardian' | 'other';

const statusLabel: Record<StudentStatus, string> = {
    active: 'Active',
    graduated: 'Graduated',
    transferred: 'Transferred',
    withdrawn: 'Withdrawn',
};

const statusVariant: Record<
    StudentStatus,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    active: 'default',
    graduated: 'secondary',
    transferred: 'outline',
    withdrawn: 'destructive',
};

const relationshipLabel: Record<GuardianRelationship, string> = {
    father: 'Father',
    mother: 'Mother',
    guardian: 'Guardian',
    other: 'Other',
};

type SchoolClassOption = { id: string; name: string };

type Enrollment = {
    id: string;
    session: { id: string; name: string };
    class: SchoolClassOption;
};

type Guardian = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    relationship: GuardianRelationship;
    is_primary: boolean;
};

type AttendanceTerm = {
    term_id: string;
    term_name: TermName;
    session_name: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
};

type GradeTerm = {
    term_id: string;
    term_name: TermName;
    session_name: string;
    subjects: {
        subject: string;
        ca_score: number;
        exam_score: number;
        total: number;
        grade: string;
    }[];
    average: number;
};

type Student = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    admission_number: string | null;
    admission_date: string | null;
    date_of_birth: string | null;
    status: StudentStatus;
};

export default function StudentShow({
    student,
    current_class: currentClass,
    enrollments,
    guardians,
    attendance_by_term: attendanceByTerm,
    current_term_grades: currentTermGrades,
}: {
    student: Student;
    current_class: SchoolClassOption | null;
    enrollments: Enrollment[];
    guardians: Guardian[];
    attendance_by_term: AttendanceTerm[];
    current_term_grades: GradeTerm | null;
}) {
    const visibleEnrollments = enrollments.slice(0, 5);
    setLayoutProps({
        breadcrumbs: [
            { title: 'Students', href: students.index() },
            { title: student.name, href: students.show(student.id) },
        ],
    });

    return (
        <>
            <Head title={student.name} />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        title={student.name}
                        description={
                            currentClass
                                ? `${currentClass.name} · ${student.admission_number ?? 'No admission number'}`
                                : (student.admission_number ??
                                  'No admission number')
                        }
                    />
                    <Badge variant={statusVariant[student.status]}>
                        {statusLabel[student.status]}
                    </Badge>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="text-muted-foreground size-4" />
                                Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Email
                                </span>
                                <span>{student.email ?? '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Phone
                                </span>
                                <span>{student.phone ?? '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Admission Date
                                </span>
                                <span>
                                    {student.admission_date
                                        ? new Date(
                                              student.admission_date,
                                          ).toLocaleDateString(undefined, {
                                              year: 'numeric',
                                              month: 'short',
                                              day: 'numeric',
                                          })
                                        : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Date of Birth
                                </span>
                                <span>
                                    {student.date_of_birth
                                        ? new Date(
                                              student.date_of_birth,
                                          ).toLocaleDateString(undefined, {
                                              year: 'numeric',
                                              month: 'short',
                                              day: 'numeric',
                                          })
                                        : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Current Class
                                </span>
                                <span>
                                    {currentClass?.name ?? 'Not enrolled'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <GuardiansCard
                        guardians={guardians}
                        relationshipLabel={relationshipLabel}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <GraduationCap className="text-muted-foreground size-4" />
                                Enrollment History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-0">
                            {enrollments.length === 0 ? (
                                <p className="text-muted-foreground px-6 text-sm">
                                    Not enrolled in any session yet.
                                </p>
                            ) : (
                                <>
                                    <DataTable>
                                        <THead>
                                            <Th>Session</Th>
                                            <Th>Class</Th>
                                        </THead>
                                        <TBody>
                                            {visibleEnrollments.map(
                                                (enrollment) => (
                                                    <Tr key={enrollment.id}>
                                                        <Td>
                                                            {
                                                                enrollment
                                                                    .session
                                                                    .name
                                                            }
                                                        </Td>
                                                        <Td muted>
                                                            {
                                                                enrollment.class
                                                                    .name
                                                            }
                                                        </Td>
                                                    </Tr>
                                                ),
                                            )}
                                        </TBody>
                                    </DataTable>
                                    {enrollments.length >
                                        visibleEnrollments.length && (
                                        <p className="text-muted-foreground mt-2 text-xs">
                                            Showing {visibleEnrollments.length}{' '}
                                            most recent of {enrollments.length}
                                        </p>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <CalendarCheck className="text-muted-foreground size-4" />
                                Attendance History
                            </CardTitle>
                            <Button
                                variant="link"
                                size="sm"
                                asChild
                                className="h-auto p-0"
                            >
                                <Link href={students.attendance(student)}>
                                    View all attendance
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="px-0">
                            {attendanceByTerm.length === 0 ? (
                                <p className="text-muted-foreground px-6 text-sm">
                                    No attendance recorded yet.
                                </p>
                            ) : (
                                <DataTable>
                                    <THead>
                                        <Th>Term</Th>
                                        <Th>Present</Th>
                                        <Th>Absent</Th>
                                        <Th>Late</Th>
                                        <Th>Excused</Th>
                                        <Th>Rate</Th>
                                    </THead>
                                    <TBody>
                                        {attendanceByTerm.map((term) => (
                                            <Tr key={term.term_id}>
                                                <Td>
                                                    {termLabel[term.term_name]}{' '}
                                                    ({term.session_name})
                                                </Td>
                                                <Td>{term.present}</Td>
                                                <Td>{term.absent}</Td>
                                                <Td>{term.late}</Td>
                                                <Td>{term.excused}</Td>
                                                <Td muted>
                                                    {term.total > 0
                                                        ? `${Math.round((term.present / term.total) * 100)}%`
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

                <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle>
                            {currentTermGrades
                                ? `Grades — ${termLabel[currentTermGrades.term_name]} (${currentTermGrades.session_name})`
                                : 'Grades'}
                        </CardTitle>
                        <Button
                            variant="link"
                            size="sm"
                            asChild
                            className="h-auto p-0"
                        >
                            <Link href={students.grades(student)}>
                                View full breakdown
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="px-0">
                        {!currentTermGrades ? (
                            <p className="text-muted-foreground px-6 text-sm">
                                No grades recorded yet for the current term.
                            </p>
                        ) : (
                            <div>
                                <div className="mb-2 flex items-center justify-end px-6">
                                    <div className="text-muted-foreground text-sm">
                                        Average: {currentTermGrades.average}
                                    </div>
                                </div>
                                <DataTable>
                                    <THead>
                                        <Th>Subject</Th>
                                        <Th>CA</Th>
                                        <Th>Exam</Th>
                                        <Th>Total</Th>
                                        <Th>Grade</Th>
                                    </THead>
                                    <TBody>
                                        {currentTermGrades.subjects.map(
                                            (subject) => (
                                                <Tr key={subject.subject}>
                                                    <Td>{subject.subject}</Td>
                                                    <Td>{subject.ca_score}</Td>
                                                    <Td>
                                                        {subject.exam_score}
                                                    </Td>
                                                    <Td>{subject.total}</Td>
                                                    <Td
                                                        muted
                                                        className="uppercase"
                                                    >
                                                        {subject.grade}
                                                    </Td>
                                                </Tr>
                                            ),
                                        )}
                                    </TBody>
                                </DataTable>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
