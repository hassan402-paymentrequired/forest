import { Head } from '@inertiajs/react';
import { BookOpen, GraduationCap, School as SchoolIcon } from 'lucide-react';
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
import { SchoolCell } from '@/components/ministry/school-cell';
import { Pagination } from '@/components/pagination';
import { Section } from '@/components/section';
import { StatCard } from '@/components/stat-card';
import { count } from '@/lib/ministry';
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
    totals: Totals & { subjects: number };
    subjects: { subject: string; schools: number }[];
    schools: Paginated<SchoolRow>;
};

export default function Coverage({
    filters,
    options,
    totals,
    subjects,
    schools,
}: Props) {
    const state = useScopeFilters(ministry.coverage().url, filters);

    return (
        <>
            <Head title="Coverage" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Classes and subjects"
                    description="What each school offers, and the subjects few schools cover"
                />

                <ScopeFilterBar state={state} options={options} />

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Schools"
                        value={count(totals.schools)}
                        icon={SchoolIcon}
                    />
                    <StatCard
                        label="Active classes"
                        value={count(totals.classes)}
                        icon={GraduationCap}
                    />
                    <StatCard
                        label="Subject offerings"
                        value={count(totals.subjects)}
                        icon={BookOpen}
                    />
                </div>

                <Section
                    title="Least offered subjects"
                    icon={BookOpen}
                    action={
                        <span className="text-muted-foreground text-xs">
                            Schools offering each
                        </span>
                    }
                >
                    <BarList
                        emptyLabel="No subjects recorded yet."
                        max={Math.max(totals.schools, 1)}
                        rows={subjects.slice(0, 10).map((row) => ({
                            label: row.subject,
                            value: row.schools,
                            note: `of ${totals.schools}`,
                        }))}
                    />
                </Section>

                <DataTableCard
                    title="Schools by subjects offered"
                    description="Fewest first"
                    count={schools.total}
                    noun="school"
                >
                    {schools.data.length === 0 ? (
                        <TableEmptyState
                            icon={BookOpen}
                            title="No schools found"
                            description="No active school matches these filters."
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>School</Th>
                                <Th align="right">Classes</Th>
                                <Th align="right">Subjects</Th>
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
                                            {count(school.classes_active)}
                                        </Td>
                                        <Td
                                            align="right"
                                            className="tabular-nums"
                                        >
                                            {count(school.subjects_active)}
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

Coverage.layout = {
    breadcrumbs: [{ title: 'Coverage', href: ministry.coverage() }],
};
