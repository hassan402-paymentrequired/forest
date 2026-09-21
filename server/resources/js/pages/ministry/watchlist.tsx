import { Head } from '@inertiajs/react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import {
    DataTable,
    DataTableCard,
    FilterSelect,
    TBody,
    TableEmptyState,
    THead,
    Td,
    Th,
    Tr,
} from '@/components/data-table';
import Heading from '@/components/heading';
import { FlagBadges } from '@/components/ministry/badges';
import {
    ScopeFilterBar,
    useScopeFilters,
} from '@/components/ministry/scope-filter-bar';
import { SchoolCell } from '@/components/ministry/school-cell';
import { Pagination } from '@/components/pagination';
import { StatCard } from '@/components/stat-card';
import { percent } from '@/lib/ministry';
import ministry from '@/routes/ministry';
import type { Paginated } from '@/types/pagination';
import type { FilterOptions, Flag, ScopeFilters } from '@/types/ministry';

type Row = {
    id: string;
    name: string;
    lga_label: string | null;
    attendance_rate: number | null;
    student_teacher_ratio: number | null;
    pass_rate: number | null;
    flags: Flag[];
};

type Props = {
    filters: ScopeFilters & { flag: string };
    options: FilterOptions;
    thresholds: {
        attendance_rate: number;
        student_teacher_ratio: number;
        pass_rate: number;
        stale_days: number;
    };
    total_schools: number;
    flagged_schools: number;
    summary: { key: string; label: string; schools: number }[];
    schools: Paginated<Row>;
};

export default function Watchlist({
    filters,
    options,
    thresholds,
    total_schools: total,
    flagged_schools: flagged,
    summary,
    schools,
}: Props) {
    const state = useScopeFilters(ministry.watchlist().url, filters);

    return (
        <>
            <Head title="Watchlist" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Watchlist"
                    description={`Schools below ${thresholds.attendance_rate}% attendance, above ${thresholds.student_teacher_ratio} students per teacher, below ${thresholds.pass_rate}% pass rate, or with no attendance in ${thresholds.stale_days} days`}
                />

                <ScopeFilterBar state={state} options={options}>
                    <FilterSelect
                        id="filter-flag"
                        label="Reason"
                        value={state.filters.flag}
                        onChange={(value) => state.update('flag', value)}
                        allLabel="All reasons"
                        options={summary.map((item) => ({
                            value: item.key,
                            label: `${item.label} (${item.schools})`,
                        }))}
                    />
                </ScopeFilterBar>

                <div className="grid gap-4 sm:grid-cols-2">
                    <StatCard
                        label="Schools flagged"
                        value={flagged}
                        icon={ShieldAlert}
                    />
                    <StatCard
                        label="Schools not flagged"
                        value={total - flagged}
                        icon={ShieldCheck}
                    />
                </div>

                <DataTableCard
                    title="Schools at risk"
                    description="Most reasons first. Hover a reason for the detail."
                    count={schools.total}
                    noun="school"
                >
                    {schools.data.length === 0 ? (
                        <TableEmptyState
                            icon={ShieldCheck}
                            title="Nothing to flag"
                            description="No school matches these filters and trips a rule."
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>School</Th>
                                <Th>Reasons</Th>
                                <Th align="right" hideOnMobile>
                                    Attendance
                                </Th>
                                <Th align="right" hideOnMobile>
                                    Per teacher
                                </Th>
                                <Th align="right" hideOnMobile>
                                    Pass rate
                                </Th>
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
                                        <Td>
                                            <FlagBadges flags={school.flags} />
                                        </Td>
                                        <Td
                                            align="right"
                                            hideOnMobile
                                            className="tabular-nums"
                                        >
                                            {percent(school.attendance_rate)}
                                        </Td>
                                        <Td
                                            align="right"
                                            hideOnMobile
                                            className="tabular-nums"
                                        >
                                            {school.student_teacher_ratio ??
                                                '—'}
                                        </Td>
                                        <Td
                                            align="right"
                                            hideOnMobile
                                            className="tabular-nums"
                                        >
                                            {percent(school.pass_rate)}
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

Watchlist.layout = {
    breadcrumbs: [{ title: 'Watchlist', href: ministry.watchlist() }],
};
