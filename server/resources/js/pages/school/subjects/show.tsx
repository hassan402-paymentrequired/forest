import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { Award, Pencil, Power, PowerOff, Users } from 'lucide-react';
import { useState } from 'react';
import {
    DataTable,
    StatusBadge,
    TBody,
    THead,
    Td,
    Th,
    Tr,
} from '@/components/data-table';
import {
    recordStatusLabel,
    recordStatusTone,
} from '@/components/record-status';
import type { RecordStatus } from '@/components/record-status';
import { statusTone as teacherStatusTone } from '@/components/school/teachers/teacher';
import type { TeacherStatus } from '@/components/school/teachers/teacher';
import { EditSubjectDialog } from '@/components/school/subjects/edit-subject-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleStatusDialog } from '@/components/toggle-status-dialog';
import { cn } from '@/lib/utils';
import subjects from '@/routes/subjects';
import teachers from '@/routes/teachers';
import { termLabel } from '@/components/school/academic-terms/academic-term';

type TermName = 'first_term' | 'second_term' | 'third_term';

type Subject = {
    id: string;
    name: string;
    status: RecordStatus;
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
    const [editing, setEditing] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);
    const isActive = subject.status === 'active';

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
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-semibold tracking-tight">
                                {subject.name}
                            </h2>
                            <StatusBadge
                                tone={recordStatusTone[subject.status]}
                            >
                                {recordStatusLabel[subject.status]}
                            </StatusBadge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Qualified teachers and grade history by term
                        </p>
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
                            {isActive ? <PowerOff /> : <Power />}
                            {isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                    </div>
                </div>

                {!isActive && (
                    <div className="border-sidebar-border/70 dark:border-sidebar-border text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
                        This subject is inactive. It's hidden from the pickers
                        for teachers and grades, but its history is kept.
                    </div>
                )}

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
                                        <StatusBadge
                                            tone={
                                                teacherStatusTone[
                                                    teacher.status
                                                ]
                                            }
                                        >
                                            {teacher.name}
                                        </StatusBadge>
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

            {editing && (
                <EditSubjectDialog
                    subject={subject}
                    onClose={() => setEditing(false)}
                />
            )}

            <ToggleStatusDialog
                record={togglingStatus ? subject : null}
                url={subjects.status.update(subject.id).url}
                active={isActive}
                noun="subject"
                onClose={() => setTogglingStatus(false)}
            />
        </>
    );
}
