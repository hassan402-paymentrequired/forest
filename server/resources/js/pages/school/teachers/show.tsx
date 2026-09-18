import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { BookOpen, GraduationCap, User } from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { DataTable, TBody, THead, Td, Th, Tr } from '@/components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import classes from '@/routes/classes';
import subjects from '@/routes/subjects';
import teachers from '@/routes/teachers';
import { termLabel } from '../academic-terms';

type TeacherStatus = 'active' | 'on_leave' | 'transferred' | 'inactive';
type TermName = 'first_term' | 'second_term' | 'third_term';

const statusLabel: Record<TeacherStatus, string> = {
    active: 'Active',
    on_leave: 'On Leave',
    transferred: 'Transferred',
    inactive: 'Inactive',
};

const statusVariant: Record<
    TeacherStatus,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    active: 'default',
    on_leave: 'secondary',
    transferred: 'outline',
    inactive: 'destructive',
};

type SubjectOption = {
    id: string;
    name: string;
};

type Teacher = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    subjects: SubjectOption[];
    status: TeacherStatus;
};

type ClassAssignment = {
    id: string;
    class: { id: string; name: string };
    term_name: TermName;
    session_name: string;
    is_current: boolean;
};

type GradeTerm = {
    term_id: string;
    term_name: TermName;
    session_name: string;
    entries: {
        subject: string;
        class: string;
        students_graded: number;
        average: number;
    }[];
};

export default function TeacherShow({
    teacher,
    class_assignments: classAssignments,
    grades_by_term: gradesByTerm,
}: {
    teacher: Teacher;
    class_assignments: ClassAssignment[];
    grades_by_term: GradeTerm[];
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Teachers', href: teachers.index() },
            { title: teacher.name, href: teachers.show(teacher.id) },
        ],
    });

    return (
        <>
            <Head title={teacher.name} />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        title={teacher.name}
                        description={
                            [teacher.email, teacher.phone]
                                .filter(Boolean)
                                .join(' · ') || undefined
                        }
                    />
                    <Badge variant={statusVariant[teacher.status]}>
                        {statusLabel[teacher.status]}
                    </Badge>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="text-muted-foreground size-4" />
                                Subjects
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {teacher.subjects.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    No subjects listed.
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
                                                className="hover:opacity-80"
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
                                Class Assignments
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {classAssignments.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    Not assigned as a class teacher yet.
                                </p>
                            ) : (
                                <ul className="space-y-2 text-sm">
                                    {classAssignments.map((assignment) => (
                                        <li
                                            key={assignment.id}
                                            className="flex items-center justify-between"
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

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="text-muted-foreground size-4" />
                            Grades Recorded
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 px-0">
                        {gradesByTerm.length === 0 ? (
                            <p className="text-muted-foreground px-6 text-sm">
                                No grades recorded yet.
                            </p>
                        ) : (
                            gradesByTerm.map((term) => (
                                <div key={term.term_id}>
                                    <div className="mb-2 px-6 font-medium">
                                        {termLabel[term.term_name]} (
                                        {term.session_name})
                                    </div>
                                    <DataTable>
                                        <THead>
                                            <Th>Subject</Th>
                                            <Th>Class</Th>
                                            <Th>Students Graded</Th>
                                            <Th>Average</Th>
                                        </THead>
                                        <TBody>
                                            {term.entries.map((entry) => (
                                                <Tr
                                                    key={`${entry.subject}-${entry.class}`}
                                                >
                                                    <Td>{entry.subject}</Td>
                                                    <Td muted>{entry.class}</Td>
                                                    <Td>
                                                        {entry.students_graded}
                                                    </Td>
                                                    <Td>{entry.average}</Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </DataTable>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
