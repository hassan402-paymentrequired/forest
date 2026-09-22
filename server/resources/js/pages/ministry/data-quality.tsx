import { Head } from '@inertiajs/react';
import { Activity, CheckCircle2, ClipboardX } from 'lucide-react';
import {
    DataTable,
    DataTableCard,
    FilterSelect,
    RowActions,
    TBody,
    TableEmptyState,
    THead,
    Td,
    Th,
    Tr,
} from '@/components/data-table';
import Heading from '@/components/heading';
import { IssueBadges } from '@/components/ministry/badges';
import {
    ScopeFilterBar,
    useScopeFilters,
} from '@/components/ministry/scope-filter-bar';
import { SchoolCell } from '@/components/ministry/school-cell';
import { Pagination } from '@/components/pagination';
import { StatCard } from '@/components/stat-card';
import ministry from '@/routes/ministry';
import type { Paginated } from '@/types/pagination';
import type { FilterOptions, Issue, ScopeFilters } from '@/types/ministry';

type Row = {
    id: string;
    name: string;
    lga_label: string | null;
    status: 'active' | 'suspended';
    issues: Issue[];
};

type Props = {
    filters: ScopeFilters & { issue: string };
    options: FilterOptions;
    total_schools: number;
    flagged_schools: number;
    summary: { key: string; label: string; schools: number }[];
    schools: Paginated<Row>;
};

export default function DataQuality({
    filters,
    options,
    total_schools: total,
    flagged_schools: flagged,
    summary,
    schools,
}: Props) {
    const state = useScopeFilters(ministry.dataQuality().url, filters);

    return (
        <>
            <Head title="Data quality" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Data quality"
                    description="Schools with gaps in what they record, which limit how far their numbers can be trusted"
                />

                <ScopeFilterBar state={state} options={options}>
                    <FilterSelect
                        id="filter-issue"
                        label="Gap"
                        value={state.filters.issue}
                        onChange={(value) => state.update('issue', value)}
                        allLabel="All gaps"
                        options={summary.map((item) => ({
                            value: item.key,
                            label: `${item.label} (${item.schools})`,
                        }))}
                    />
                </ScopeFilterBar>

                <div className="grid gap-4 sm:grid-cols-2">
                    <StatCard
                        label="Schools with gaps"
                        value={flagged}
                        icon={ClipboardX}
                    />
                    <StatCard
                        label="Schools complete"
                        value={total - flagged}
                        icon={CheckCircle2}
                    />
                </div>

                <DataTableCard
                    title="Schools with gaps"
                    description="Most gaps first"
                    count={schools.total}
                    noun="school"
                >
                    {schools.data.length === 0 ? (
                        <TableEmptyState
                            icon={Activity}
                            title="No gaps found"
                            description="Every school matching these filters is up to date."
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>School</Th>
                                <Th>Gaps</Th>
                                <Th align="right">
                                    <span className="sr-only">Actions</span>
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
                                            <IssueBadges
                                                issues={school.issues}
                                            />
                                        </Td>
                                        <Td align="right">
                                            <RowActions
                                                viewHref={ministry.dataQuality.show(
                                                    school.id,
                                                )}
                                            />
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

DataQuality.layout = {
    breadcrumbs: [{ title: 'Data quality', href: ministry.dataQuality() }],
};
