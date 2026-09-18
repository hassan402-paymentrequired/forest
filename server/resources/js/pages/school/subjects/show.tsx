import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { Award, Users } from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { DataTable, TBody, THead, Td, Th, Tr } from '@/components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import subjects from '@/routes/subjects';
import teachers from '@/routes/teachers';
import { termLabel } from '../academic-terms';

type TeacherStatus = 'active' | 'on_leave' | 'transferred' | 'inactive';
type TermName = 'first_term' | 'second_term' | 'third_term';

const statusVariant: Record<
    TeacherStatus,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    active: 'default',
    on_leave: 'secondary',
    transferred: 'outline',
    inactive: 'destructive',
};

type Subject = {
    id: string;
    name: string;
};

type TeacherOption = {
    id: string;
    name: string;
    status: TeacherStatus;
};

type GradeTerm = {
    term_id: string;
    term_name: TermName;
    session_name: string;
    entries: {
        class: string;
        students_graded: number;
        average: number;
        passing: number;
    }[];
};

export default function SubjectShow({
    subject,
    teachers: qualifiedTeachers,
    grades_by_term: gradesByTerm,
}: {
    subject: Subject;
    teachers: TeacherOption[];
    grades_by_term: GradeTerm[];
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Subjects', href: subjects.index() },
            { title: subject.name, href: subjects.show(subject.id) },
        ],
    });

    return (
        <>
            <Head title={subject.name} />

            <div className="space-y-6 p-4">
                <Heading
                    title={subject.name}
                    description="Qualified teachers and grade history by term"
                />

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="text-muted-foreground size-4" />
                            Qualified Teachers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {qualifiedTeachers.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No teachers listed as qualified to teach this
                                subject yet.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {qualifiedTeachers.map((teacher) => (
                                    <Link
                                        key={teacher.id}
                                        href={teachers.show(teacher.id)}
                                    >
                                        <Badge
                                            variant={
                                                statusVariant[teacher.status]
                                            }
                                            className="hover:opacity-80"
                                        >
                                            {teacher.name}
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
                            <Award className="text-muted-foreground size-4" />
                            Grades by Class
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
                                            <Th>Class</Th>
                                            <Th>Graded</Th>
                                            <Th>Average</Th>
                                            <Th>Passing</Th>
                                        </THead>
                                        <TBody>
                                            {term.entries.map((entry) => (
                                                <Tr key={entry.class}>
                                                    <Td>{entry.class}</Td>
                                                    <Td>
                                                        {entry.students_graded}
                                                    </Td>
                                                    <Td>{entry.average}</Td>
                                                    <Td muted>
                                                        {entry.passing}/
                                                        {entry.students_graded}
                                                    </Td>
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
