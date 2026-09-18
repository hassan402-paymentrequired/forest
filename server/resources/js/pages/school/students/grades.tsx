import { Head, setLayoutProps } from '@inertiajs/react';
import Heading from '@/components/heading';
import { DataTable, TBody, THead, Td, Th, Tr } from '@/components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import students from '@/routes/students';
import { termLabel } from '../academic-terms';

type TermName = 'first_term' | 'second_term' | 'third_term';

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
};

export default function StudentGrades({
    student,
    grades_by_term: gradesByTerm,
}: {
    student: Student;
    grades_by_term: GradeTerm[];
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Students', href: students.index() },
            { title: student.name, href: students.show(student.id) },
            { title: 'Grades', href: students.grades(student.id) },
        ],
    });

    return (
        <>
            <Head title={`${student.name} · Grades`} />

            <div className="space-y-6 p-4">
                <Heading
                    title={`${student.name}'s Grades`}
                    description="Full grade breakdown across all terms"
                />

                <Card>
                    <CardHeader>
                        <CardTitle>All Terms</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 px-0">
                        {gradesByTerm.length === 0 ? (
                            <p className="text-muted-foreground px-6 text-sm">
                                No grades recorded yet.
                            </p>
                        ) : (
                            gradesByTerm.map((term) => (
                                <div key={term.term_id}>
                                    <div className="mb-2 flex items-center justify-between px-6">
                                        <div className="font-medium">
                                            {termLabel[term.term_name]} (
                                            {term.session_name})
                                        </div>
                                        <div className="text-muted-foreground text-sm">
                                            Average: {term.average}
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
                                            {term.subjects.map((subject) => (
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
