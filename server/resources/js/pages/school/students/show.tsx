import { Head, setLayoutProps } from '@inertiajs/react';
import { CalendarCheck, GraduationCap, ShieldCheck, User } from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import students from '@/routes/students';
import { termLabel } from '../academic-terms';

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
    status: StudentStatus;
};

export default function StudentShow({
    student,
    current_class: currentClass,
    enrollments,
    guardians,
    attendance_by_term: attendanceByTerm,
    grades_by_term: gradesByTerm,
}: {
    student: Student;
    current_class: SchoolClassOption | null;
    enrollments: Enrollment[];
    guardians: Guardian[];
    attendance_by_term: AttendanceTerm[];
    grades_by_term: GradeTerm[];
}) {
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
                                : (student.admission_number ?? 'No admission number')
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
                                    Current Class
                                </span>
                                <span>{currentClass?.name ?? 'Not enrolled'}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="text-muted-foreground size-4" />
                                Guardians
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {guardians.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    No guardians linked yet.
                                </p>
                            ) : (
                                <ul className="space-y-3">
                                    {guardians.map((guardian) => (
                                        <li
                                            key={guardian.id}
                                            className="flex items-center justify-between text-sm"
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    {guardian.name}
                                                    {guardian.is_primary && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="ml-2"
                                                        >
                                                            Primary
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {relationshipLabel[
                                                        guardian.relationship
                                                    ]}
                                                    {guardian.email
                                                        ? ` · ${guardian.email}`
                                                        : ''}
                                                    {guardian.phone
                                                        ? ` · ${guardian.phone}`
                                                        : ''}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GraduationCap className="text-muted-foreground size-4" />
                            Enrollment History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {enrollments.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                Not enrolled in any session yet.
                            </p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground text-left">
                                    <tr>
                                        <th className="py-2 font-medium">
                                            Session
                                        </th>
                                        <th className="py-2 font-medium">
                                            Class
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-border divide-y">
                                    {enrollments.map((enrollment) => (
                                        <tr key={enrollment.id}>
                                            <td className="py-2">
                                                {enrollment.session.name}
                                            </td>
                                            <td className="text-muted-foreground py-2">
                                                {enrollment.class.name}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarCheck className="text-muted-foreground size-4" />
                            Attendance History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {attendanceByTerm.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No attendance recorded yet.
                            </p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground text-left">
                                    <tr>
                                        <th className="py-2 font-medium">
                                            Term
                                        </th>
                                        <th className="py-2 font-medium">
                                            Present
                                        </th>
                                        <th className="py-2 font-medium">
                                            Absent
                                        </th>
                                        <th className="py-2 font-medium">
                                            Late
                                        </th>
                                        <th className="py-2 font-medium">
                                            Excused
                                        </th>
                                        <th className="py-2 font-medium">
                                            Rate
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-border divide-y">
                                    {attendanceByTerm.map((term) => (
                                        <tr key={term.term_id}>
                                            <td className="py-2">
                                                {termLabel[term.term_name]} (
                                                {term.session_name})
                                            </td>
                                            <td className="py-2">
                                                {term.present}
                                            </td>
                                            <td className="py-2">
                                                {term.absent}
                                            </td>
                                            <td className="py-2">
                                                {term.late}
                                            </td>
                                            <td className="py-2">
                                                {term.excused}
                                            </td>
                                            <td className="text-muted-foreground py-2">
                                                {term.total > 0
                                                    ? `${Math.round((term.present / term.total) * 100)}%`
                                                    : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Grades</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {gradesByTerm.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No grades recorded yet.
                            </p>
                        ) : (
                            gradesByTerm.map((term) => (
                                <div key={term.term_id}>
                                    <div className="mb-2 flex items-center justify-between">
                                        <div className="font-medium">
                                            {termLabel[term.term_name]} (
                                            {term.session_name})
                                        </div>
                                        <div className="text-muted-foreground text-sm">
                                            Average: {term.average}
                                        </div>
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead className="text-muted-foreground text-left">
                                            <tr>
                                                <th className="py-2 font-medium">
                                                    Subject
                                                </th>
                                                <th className="py-2 font-medium">
                                                    CA
                                                </th>
                                                <th className="py-2 font-medium">
                                                    Exam
                                                </th>
                                                <th className="py-2 font-medium">
                                                    Total
                                                </th>
                                                <th className="py-2 font-medium">
                                                    Grade
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-border divide-y">
                                            {term.subjects.map((subject) => (
                                                <tr key={subject.subject}>
                                                    <td className="py-2">
                                                        {subject.subject}
                                                    </td>
                                                    <td className="py-2">
                                                        {subject.ca_score}
                                                    </td>
                                                    <td className="py-2">
                                                        {subject.exam_score}
                                                    </td>
                                                    <td className="py-2">
                                                        {subject.total}
                                                    </td>
                                                    <td className="text-muted-foreground py-2 uppercase">
                                                        {subject.grade}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
