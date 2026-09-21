import { Head } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import {
    CalendarCheck2,
    CalendarX2,
    ListChecks,
    TrendingDown,
} from 'lucide-react';
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
} from '@/components/data-table';
import Heading from '@/components/heading';
import { BarList, TrendChart } from '@/components/ministry/charts';
import {
    ScopeFilterBar,
    useScopeFilters,
} from '@/components/ministry/scope-filter-bar';
import { SchoolCell } from '@/components/ministry/school-cell';
import { Pagination } from '@/components/pagination';
import { Section } from '@/components/section';
import { StatCard } from '@/components/stat-card';
import { count, formatDate, percent, rateTone } from '@/lib/ministry';
import ministry from '@/routes/ministry';
import type { Paginated } from '@/types/pagination';
import type {
    FilterOptions,
    SchoolRow,
    ScopeFilters,
    Totals,
} from '@/types/ministry';

type Props = {
    filters: ScopeFilters;
    options: FilterOptions;
    totals: Totals;
    threshold: number;
    below_threshold: number;
    breakdown: Record<'present' | 'absent' | 'late' | 'excused', number>;
    trend: { week: string; rate: number }[];
    schools: Paginated<SchoolRow>;
};

const breakdownLabel = {
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    excused: 'Excused',
} as const;

export default function Attendance({
    filters,
    options,
    totals,
    threshold,
    below_threshold: below,
    breakdown,
    trend,
    schools,
}: Props) {
    const state = useScopeFilters(ministry.attendance().url, filters);

    return (
        <>
            <Head title="Attendance" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Attendance"
                    description={`This term's attendance, with schools below ${threshold}% flagged`}
                />

                <ScopeFilterBar state={state} options={options} />

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Attendance this term"
                        value={percent(totals.attendance_rate)}
                        icon={CalendarCheck2}
                    />
                    <StatCard
                        label={`Schools below ${threshold}%`}
                        value={count(below)}
                        icon={TrendingDown}
                    />
                    <StatCard
                        label="Records this term"
                        value={count(
                            Object.values(breakdown).reduce(
                                (sum, value) => sum + value,
                                0,
                            ),
                        )}
                        icon={ListChecks}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Section title="Attendance by week" icon={CalendarCheck2}>
                        <TrendChart
                            caption="Weekly attendance rate across schools"
                            domain={[0, 100]}
                            format={(value) => `${value}%`}
                            data={trend.map((point) => ({
                                label: format(parseISO(point.week), 'd MMM'),
                                value: point.rate,
                            }))}
                        />
                    </Section>

                    <Section title="This term's records" icon={CalendarX2}>
                        <BarList
                            emptyLabel="No attendance recorded this term."
                            rows={(
                                Object.keys(
                                    breakdown,
                                ) as (keyof typeof breakdown)[]
                            ).map((status) => ({
                                label: breakdownLabel[status],
                                value: breakdown[status],
                            }))}
                        />
                    </Section>
                </div>

                <DataTableCard
                    title="Schools by attendance"
                    description="Lowest first"
                    count={schools.total}
                    noun="school"
                >
                    {schools.data.length === 0 ? (
                        <TableEmptyState
                            icon={CalendarCheck2}
                            title="No schools found"
                            description="No active school matches these filters."
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>School</Th>
                                <Th align="right">Attendance</Th>
                                <Th align="right" hideOnMobile>
                                    Records
                                </Th>
                                <Th hideOnMobile>Last recorded</Th>
                            </THead>
                            <TBody>
                                {schools.data.map((school) => (
                                    <Tr key={school.id}>
                                        <Td>
                                            <SchoolCell
                                                id={school.id}
                                                name={school.name}
                                                area={school.lga_label}
                                            />
                                        </Td>
                                        <Td align="right">
                                            {school.attendance_rate === null ? (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            ) : (
                                                <StatusBadge
                                                    tone={rateTone(
                                                        school.attendance_rate,
                                                        threshold,
                                                    )}
                                                >
                                                    {percent(
                                                        school.attendance_rate,
                                                    )}
                                                </StatusBadge>
                                            )}
                                        </Td>
                                        <Td
                                            align="right"
                                            hideOnMobile
                                            className="tabular-nums"
                                        >
                                            {count(school.attendance_records)}
                                        </Td>
                                        <Td muted hideOnMobile>
                                            {formatDate(
                                                school.last_attendance_date,
                                            )}
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </DataTable>
                    )}
                    <Pagination
                        links={schools.links}
                        from={schools.from}
                        to={schools.to}
                        total={schools.total}
                    />
                </DataTableCard>
            </div>
        </>
    );
}

Attendance.layout = {
    breadcrumbs: [{ title: 'Attendance', href: ministry.attendance() }],
};
