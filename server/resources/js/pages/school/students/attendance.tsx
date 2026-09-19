import { Head, setLayoutProps } from '@inertiajs/react';
import { format } from 'date-fns';
import { CalendarCheck, CalendarX2 } from 'lucide-react';
import DateField from '@/components/date-field';
import {
    DataTable,
    DataTableCard,
    FilterBar,
    FilterSelect,
    StatusBadge,
    TBody,
    TableEmptyState,
    THead,
    Td,
    Th,
    Tr,
    type Tone,
} from '@/components/data-table';
import Heading from '@/components/heading';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { useListFilters } from '@/hooks/use-list-filters';
import students from '@/routes/students';
import type { Paginated } from '@/types/pagination';
import { termLabel } from '@/components/school/academic-terms/academic-term';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
type TermName = 'first_term' | 'second_term' | 'third_term';

const statusLabel: Record<AttendanceStatus, string> = {
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    excused: 'Excused',
};

const statusTone: Record<AttendanceStatus, Tone> = {
    present: 'success',
    absent: 'danger',
    late: 'warning',
    excused: 'info',
};

type SchoolClassOption = { id: string; name: string };
type TermOption = { id: string; name: TermName; session_name: string };

type AttendanceRecord = {
    id: string;
    date: string;
    status: AttendanceStatus;
    class: string;
    term_name: TermName;
    session_name: string;
};

type Student = { id: string; name: string };

type Filters = {
    term_id: string;
    class_id: string;
    status: string;
    date_from: string;
    date_to: string;
};

const emptyFilters: Filters = {
    term_id: '',
    class_id: '',
    status: '',
    date_from: '',
    date_to: '',
};

// Parse as local time so "2026-01-12" never shifts a day across timezones.
function formatDate(value: string) {
    return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(
        undefined,
        { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' },
    );
}

function parseDate(value: string) {
    return value ? new Date(`${value.slice(0, 10)}T00:00:00`) : undefined;
}

function toDateString(date?: Date) {
    return date ? format(date, 'yyyy-MM-dd') : '';
}

export default function StudentAttendance({
    student,
    records,
    classes,
    terms,
    filters: initialFilters,
}: {
    student: Student;
    records: Paginated<AttendanceRecord>;
    classes: SchoolClassOption[];
    terms: TermOption[];
    filters: Partial<Filters>;
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Students', href: students.index() },
            { title: student.name, href: students.show(student.id) },
            { title: 'Attendance', href: students.attendance(student.id) },
        ],
    });

    const [filters, setFilters] = useListFilters(
        students.attendance(student.id).url,
        {
            term_id: initialFilters.term_id ?? '',
            class_id: initialFilters.class_id ?? '',
            status: initialFilters.status ?? '',
            date_from: initialFilters.date_from ?? '',
            date_to: initialFilters.date_to ?? '',
        },
    );

    const update = (key: keyof Filters, value: string) =>
        setFilters((current) => ({ ...current, [key]: value }));

    const activeCount = Object.values(filters).filter(Boolean).length;
    const clearFilters = () => setFilters(() => ({ ...emptyFilters }));

    return (
        <>
            <Head title={`${student.name} · Attendance`} />

            <div className="space-y-6 p-4">
                <Heading
                    title={`${student.name}'s attendance`}
                    description="Full attendance history across all terms"
                />

                <DataTableCard
                    title="All records"
                    icon={CalendarCheck}
                    count={records.total}
                    filters={
                        <FilterBar
                            activeCount={activeCount}
                            onClear={clearFilters}
                            className="lg:grid-cols-5"
                        >
                            <FilterSelect
                                id="attendance-term"
                                label="Term"
                                value={filters.term_id}
                                onChange={(v) => update('term_id', v)}
                                allLabel="All terms"
                                options={terms.map((term) => ({
                                    value: term.id,
                                    label: `${termLabel[term.name]} (${term.session_name})`,
                                }))}
                            />
                            <FilterSelect
                                id="attendance-class"
                                label="Class"
                                value={filters.class_id}
                                onChange={(v) => update('class_id', v)}
                                allLabel="All classes"
                                options={classes.map((c) => ({
                                    value: c.id,
                                    label: c.name,
                                }))}
                            />
                            <FilterSelect
                                id="attendance-status"
                                label="Status"
                                value={filters.status}
                                onChange={(v) => update('status', v)}
                                allLabel="All statuses"
                                options={Object.entries(statusLabel).map(
                                    ([value, label]) => ({ value, label }),
                                )}
                            />
                            <DateField
                                label="From"
                                name="date_from"
                                value={parseDate(filters.date_from)}
                                onChange={(date) =>
                                    update('date_from', toDateString(date))
                                }
                            />
                            <DateField
                                label="To"
                                name="date_to"
                                value={parseDate(filters.date_to)}
                                onChange={(date) =>
                                    update('date_to', toDateString(date))
                                }
                            />
                        </FilterBar>
                    }
                >
                    {records.data.length === 0 ? (
                        <TableEmptyState
                            icon={CalendarX2}
                            title="No records found"
                            description={
                                activeCount > 0
                                    ? 'Nothing matches these filters. Try widening the date range or clearing them.'
                                    : "Attendance will show up here once it's marked."
                            }
                            action={
                                activeCount > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={clearFilters}
                                    >
                                        Clear filters
                                    </Button>
                                )
                            }
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>Date</Th>
                                <Th hideOnMobile>Term</Th>
                                <Th hideOnMobile>Class</Th>
                                <Th align="right">Status</Th>
                            </THead>
                            <TBody>
                                {records.data.map((record) => (
                                    <Tr key={record.id}>
                                        <Td>
                                            <div className="font-medium tabular-nums">
                                                {formatDate(record.date)}
                                            </div>
                                            {/* Term + class fold under the date on mobile */}
                                            <div className="text-muted-foreground mt-0.5 text-xs md:hidden">
                                                {record.class} ·{' '}
                                                {termLabel[record.term_name]}
                                            </div>
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {termLabel[record.term_name]}
                                            <span className="text-muted-foreground/70">
                                                {' '}
                                                · {record.session_name}
                                            </span>
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {record.class}
                                        </Td>
                                        <Td align="right">
                                            <StatusBadge
                                                tone={statusTone[record.status]}
                                            >
                                                {statusLabel[record.status]}
                                            </StatusBadge>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </DataTable>
                    )}

                    <Pagination
                        links={records.links}
                        from={records.from}
                        to={records.to}
                        total={records.total}
                    />
                </DataTableCard>
            </div>
        </>
    );
}
