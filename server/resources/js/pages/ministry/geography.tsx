import { Head, Link } from '@inertiajs/react';
import { MapPin } from 'lucide-react';
import {
    DataTable,
    DataTableCard,
    TBody,
    TableEmptyState,
    THead,
    Td,
    Th,
    Tr,
} from '@/components/data-table';
import Heading from '@/components/heading';
import { BarList } from '@/components/ministry/charts';
import {
    ScopeFilterBar,
    useScopeFilters,
} from '@/components/ministry/scope-filter-bar';
import { Section } from '@/components/section';
import { StatCard } from '@/components/stat-card';
import { count, percent } from '@/lib/ministry';
import ministry from '@/routes/ministry';
import schools from '@/routes/schools';
import type {
    FilterOptions,
    GroupTotals,
    ScopeFilters,
    Totals,
} from '@/types/ministry';

type Props = {
    filters: ScopeFilters;
    options: FilterOptions;
    totals: Totals;
    unlocated_schools: number;
    by_lga: GroupTotals[];
    by_district: GroupTotals[];
};

function GroupTable({
    title,
    rows,
    emptyDescription,
}: {
    title: string;
    rows: GroupTotals[];
    emptyDescription: string;
}) {
    return (
        <DataTableCard
            title={title}
            icon={MapPin}
            count={rows.length}
            noun="area"
        >
            {rows.length === 0 ? (
                <TableEmptyState
                    icon={MapPin}
                    title="Nothing to show"
                    description={emptyDescription}
                />
            ) : (
                <DataTable>
                    <THead>
                        <Th>Area</Th>
                        <Th align="right">Schools</Th>
                        <Th align="right">Students</Th>
                        <Th align="right" hideOnMobile>
                            Teachers
                        </Th>
                        <Th align="right">Attendance</Th>
                        <Th align="right" hideOnMobile>
                            Avg score
                        </Th>
                        <Th align="right" hideOnMobile>
                            Per teacher
                        </Th>
                    </THead>
                    <TBody>
                        {rows.map((row) => (
                            <Tr key={row.value}>
                                <Td className="font-medium">{row.label}</Td>
                                <Td align="right" className="tabular-nums">
                                    {count(row.schools)}
                                </Td>
                                <Td align="right" className="tabular-nums">
                                    {count(row.students)}
                                </Td>
                                <Td
                                    align="right"
                                    hideOnMobile
                                    className="tabular-nums"
                                >
                                    {count(row.teachers)}
                                </Td>
                                <Td align="right" className="tabular-nums">
                                    {percent(row.attendance_rate)}
                                </Td>
                                <Td
                                    align="right"
                                    hideOnMobile
                                    className="tabular-nums"
                                >
                                    {row.average_score ?? '—'}
                                </Td>
                                <Td
                                    align="right"
                                    hideOnMobile
                                    className="tabular-nums"
                                >
                                    {row.student_teacher_ratio ?? '—'}
                                </Td>
                            </Tr>
                        ))}
                    </TBody>
                </DataTable>
            )}
        </DataTableCard>
    );
}

export default function Geography({
    filters,
    options,
    totals,
    unlocated_schools: unlocated,
    by_lga: byLga,
    by_district: byDistrict,
}: Props) {
    const state = useScopeFilters(ministry.geography().url, filters);

    return (
        <>
            <Head title="Geography" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Geography"
                    description="The same numbers rolled up by LGA and education district"
                />

                <ScopeFilterBar state={state} options={options} />

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Schools"
                        value={count(totals.schools)}
                        icon={MapPin}
                    />
                    <StatCard
                        label="LGAs covered"
                        value={count(byLga.length)}
                        icon={MapPin}
                    />
                    <StatCard
                        label="Districts covered"
                        value={count(byDistrict.length)}
                        icon={MapPin}
                    />
                </div>

                {unlocated > 0 && (
                    <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
                        {unlocated}{' '}
                        {unlocated === 1 ? 'school has' : 'schools have'} no LGA
                        set and {unlocated === 1 ? 'is' : 'are'} left out of the
                        area breakdown. Set it from a school&apos;s page in{' '}
                        <Link
                            href={schools.index()}
                            className="text-foreground underline"
                        >
                            Schools
                        </Link>
                        .
                    </p>
                )}

                <Section title="Students by LGA" icon={MapPin}>
                    <BarList
                        emptyLabel="Schools have no LGA set yet."
                        rows={byLga.map((row) => ({
                            label: row.label,
                            value: row.students,
                        }))}
                    />
                </Section>

                <GroupTable
                    title="By LGA"
                    rows={byLga}
                    emptyDescription="Schools have no LGA set yet."
                />
                <GroupTable
                    title="By education district"
                    rows={byDistrict}
                    emptyDescription="Schools have no education district set yet."
                />
            </div>
        </>
    );
}

Geography.layout = {
    breadcrumbs: [{ title: 'Geography', href: ministry.geography() }],
};
