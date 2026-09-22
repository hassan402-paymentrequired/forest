import { Head } from '@inertiajs/react';
import { GraduationCap, MapPin, UsersRound } from 'lucide-react';
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
import { AreaTrend, BarList, DonutChart } from '@/components/ministry/charts';
import {
    ScopeFilterBar,
    useScopeFilters,
} from '@/components/ministry/scope-filter-bar';
import { SchoolCell } from '@/components/ministry/school-cell';
import { Pagination } from '@/components/pagination';
import { Section } from '@/components/section';
import { StatCard } from '@/components/stat-card';
import { count } from '@/lib/ministry';
import ministry from '@/routes/ministry';
import type { Paginated } from '@/types/pagination';
import type {
    FilterOptions,
    GroupTotals,
    SchoolRow,
    ScopeFilters,
    Totals,
} from '@/types/ministry';

type Props = {
    filters: ScopeFilters;
    options: FilterOptions;
    totals: Totals;
    statuses: Record<
        'active' | 'graduated' | 'transferred' | 'withdrawn',
        number
    >;
    by_session: { session: string; students: number }[];
    by_lga: GroupTotals[];
    schools: Paginated<SchoolRow>;
};

const statusLabel = {
    active: 'Active',
    graduated: 'Graduated',
    transferred: 'Transferred',
    withdrawn: 'Withdrawn',
} as const;

export default function Enrolment({
    filters,
    options,
    totals,
    statuses,
    by_session: bySession,
    by_lga: byLga,
    schools,
}: Props) {
    const state = useScopeFilters(ministry.enrolment().url, filters);

    return (
        <>
            <Head title="Enrolment" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Enrolment"
                    description="Where students are enrolled, and how enrolment is moving"
                />

                <ScopeFilterBar state={state} options={options} />

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Active students"
                        value={count(totals.students)}
                        icon={UsersRound}
                    />
                    <StatCard
                        label="Active classes"
                        value={count(totals.classes)}
                        icon={GraduationCap}
                    />
                    <StatCard
                        label="Schools"
                        value={count(totals.schools)}
                        icon={MapPin}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Section title="Students by status" icon={UsersRound}>
                        <DonutChart
                            totalLabel="Students"
                            data={(
                                Object.keys(
                                    statuses,
                                ) as (keyof typeof statuses)[]
                            ).map((status) => ({
                                label: statusLabel[status],
                                value: statuses[status],
                            }))}
                        />
                    </Section>

                    <Section title="Enrolment by session" icon={GraduationCap}>
                        <AreaTrend
                            caption="Students enrolled by session"
                            data={bySession.map((row) => ({
                                label: row.session,
                                value: row.students,
                            }))}
                        />
                    </Section>
                </div>

                <Section title="Largest LGAs by students" icon={MapPin}>
                    <BarList
                        emptyLabel="Schools have no LGA set yet."
                        rows={byLga.map((row) => ({
                            label: row.label,
                            value: row.students,
                            note: `${row.schools} ${row.schools === 1 ? 'school' : 'schools'}`,
                        }))}
                    />
                </Section>

                <DataTableCard
                    title="Schools by enrolment"
                    count={schools.total}
                    noun="school"
                >
                    {schools.data.length === 0 ? (
                        <TableEmptyState
                            icon={UsersRound}
                            title="No schools found"
                            description="No active school matches these filters."
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>School</Th>
                                <Th align="right">Students</Th>
                                <Th align="right" hideOnMobile>
                                    Classes
                                </Th>
                                <Th hideOnMobile>Status</Th>
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
                                        <Td
                                            align="right"
                                            className="tabular-nums"
                                        >
                                            {count(school.students_active)}
                                        </Td>
                                        <Td
                                            align="right"
                                            hideOnMobile
                                            className="tabular-nums"
                                        >
                                            {count(school.classes_active)}
                                        </Td>
                                        <Td hideOnMobile>
                                            <StatusBadge
                                                tone={
                                                    school.status === 'active'
                                                        ? 'success'
                                                        : 'danger'
                                                }
                                            >
                                                {school.status === 'active'
                                                    ? 'Active'
                                                    : 'Suspended'}
                                            </StatusBadge>
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

Enrolment.layout = {
    breadcrumbs: [{ title: 'Enrolment', href: ministry.enrolment() }],
};
