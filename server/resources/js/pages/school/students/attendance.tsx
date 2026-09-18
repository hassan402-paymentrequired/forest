import { Head, setLayoutProps } from '@inertiajs/react';
import { CalendarCheck } from 'lucide-react';
import Heading from '@/components/heading';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import students from '@/routes/students';
import type { Paginated } from '@/types/pagination';
import { termLabel } from '../academic-terms';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const statusLabel: Record<AttendanceStatus, string> = {
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    excused: 'Excused',
};

const statusVariant: Record<
    AttendanceStatus,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    present: 'default',
    absent: 'destructive',
    late: 'secondary',
    excused: 'outline',
};

type TermName = 'first_term' | 'second_term' | 'third_term';

type AttendanceRecord = {
    id: string;
    date: string;
    status: AttendanceStatus;
    class: string;
    term_name: TermName;
    session_name: string;
};

type Student = {
    id: string;
    name: string;
};

export default function StudentAttendance({
    student,
    records,
}: {
    student: Student;
    records: Paginated<AttendanceRecord>;
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Students', href: students.index() },
            { title: student.name, href: students.show(student.id) },
            { title: 'Attendance', href: students.attendance(student.id) },
        ],
    });

    return (
        <>
            <Head title={`${student.name} · Attendance`} />

            <div className="space-y-6 p-4">
                <Heading
                    title={`${student.name}'s Attendance`}
                    description="Full attendance history across all terms"
                />

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarCheck className="text-muted-foreground size-4" />
                            All Records
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0">
                        {records.data.length === 0 ? (
                            <p className="text-muted-foreground px-6 text-sm">
                                No attendance recorded yet.
                            </p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground text-left">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 font-medium">
                                            Term
                                        </th>
                                        <th className="px-6 py-3 font-medium">
                                            Class
                                        </th>
                                        <th className="px-6 py-3 font-medium">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-border divide-y">
                                    {records.data.map((record) => (
                                        <tr key={record.id}>
                                            <td className="px-6 py-3">
                                                {new Date(
                                                    record.date,
                                                ).toLocaleDateString(
                                                    undefined,
                                                    {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    },
                                                )}
                                            </td>
                                            <td className="text-muted-foreground px-6 py-3">
                                                {termLabel[record.term_name]} (
                                                {record.session_name})
                                            </td>
                                            <td className="text-muted-foreground px-6 py-3">
                                                {record.class}
                                            </td>
                                            <td className="px-6 py-3">
                                                <Badge
                                                    variant={
                                                        statusVariant[
                                                            record.status
                                                        ]
                                                    }
                                                >
                                                    {statusLabel[record.status]}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <Pagination
                            links={records.links}
                            from={records.from}
                            to={records.to}
                            total={records.total}
                        />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
