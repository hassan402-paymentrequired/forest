import { Head, router } from '@inertiajs/react';
import { Award, BookOpen, GraduationCap, Scale, Trophy } from 'lucide-react';
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
import { BarList } from '@/components/ministry/charts';
import {
    ScopeFilterBar,
    useScopeFilters,
} from '@/components/ministry/scope-filter-bar';
import { SchoolCell } from '@/components/ministry/school-cell';
import { Pagination } from '@/components/pagination';
import { Section } from '@/components/section';
import { StatCard } from '@/components/stat-card';
import { MultiSelect } from '@/components/ui/multi-select';
import { count, percent } from '@/lib/ministry';
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
    distribution: Record<'a' | 'b' | 'c' | 'd' | 'f', number>;
    subjects: {
        subject: string;
        average: number;
        recorded: number;
        schools: number;
    }[];
    compare: {
        limit: number;
        selected: string[];
        schools: SchoolRow[];
        choices: { id: string; name: string }[];
    };
    schools: Paginated<SchoolRow>;
};

export default function Performance({
    filters,
    options,
    totals,
    distribution,
    subjects,
    compare,
    schools,
}: Props) {
    const state = useScopeFilters(ministry.performance().url, filters);

    const choose = (selected: string[]) =>
        router.get(
            ministry.performance().url,
            {
                ...Object.fromEntries(
                    Object.entries(state.filters).filter(([, value]) => value),
                ),
                compare: selected.slice(0, compare.limit),
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    return (
        <>
            <Head title="Performance" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Academic performance"
                    description="This term's grades across schools"
                />

                <ScopeFilterBar state={state} options={options} />

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Average score"
                        value={totals.average_score ?? '—'}
                        icon={Award}
                    />
                    <StatCard
                        label="Pass rate"
                        value={percent(totals.pass_rate)}
                        icon={GraduationCap}
                    />
                    <StatCard
                        label="Grades recorded"
                        value={count(totals.grades_recorded)}
                        icon={Trophy}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Section title="Grade spread" icon={GraduationCap}>
                        <BarList
                            emptyLabel="No grades recorded this term."
                            rows={(
                                Object.keys(
                                    distribution,
                                ) as (keyof typeof distribution)[]
                            ).map((letter) => ({
                                label: `Grade ${letter.toUpperCase()}`,
                                value: distribution[letter],
                            }))}
                        />
                    </Section>

                    <Section title="Average score by subject" icon={BookOpen}>
                        <BarList
                            emptyLabel="No grades recorded this term."
                            max={100}
                            rows={subjects.slice(0, 10).map((row) => ({
                                label: row.subject,
                                value: row.average,
                                note: `${row.schools} ${row.schools === 1 ? 'school' : 'schools'}`,
                            }))}
                        />
                    </Section>
                </div>

                <Section
                    title="Compare schools"
                    icon={Scale}
                    action={
                        <span className="text-muted-foreground text-xs">
                            Up to {compare.limit}
                        </span>
                    }
                >
                    <div className="grid gap-6">
                        <MultiSelect
                            id="compare-schools"
                            options={compare.choices.map((choice) => ({
                                value: choice.id,
                                label: choice.name,
                            }))}
                            value={compare.selected}
                            onChange={choose}
                            placeholder="Choose schools to compare..."
                            searchPlaceholder="Search schools..."
                        />

                        {compare.schools.length < 2 ? (
                            <p className="text-muted-foreground text-sm">
                                Pick at least two schools to see them side by
                                side.
                            </p>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2">
                                {[
                                    {
                                        title: 'Average score',
                                        key: 'average_score',
                                        max: 100,
                                        format: (value: number) => `${value}`,
                                    },
                                    {
                                        title: 'Pass rate',
                                        key: 'pass_rate',
                                        max: 100,
                                        format: (value: number) => `${value}%`,
                                    },
                                    {
                                        title: 'Attendance',
                                        key: 'attendance_rate',
                                        max: 100,
                                        format: (value: number) => `${value}%`,
                                    },
                                    {
                                        title: 'Students per teacher',
                                        key: 'student_teacher_ratio',
                                        max: undefined,
                                        format: (value: number) => `${value}`,
                                    },
                                ].map((metric) => (
                                    <div key={metric.key}>
                                        <h3 className="mb-3 text-sm font-medium">
                                            {metric.title}
                                        </h3>
                                        <BarList
                                            max={metric.max}
                                            format={metric.format}
                                            emptyLabel="No data for these schools."
                                            rows={compare.schools.flatMap(
                                                (school) => {
                                                    const value = school[
                                                        metric.key as keyof SchoolRow
                                                    ] as number | null;

                                                    return value === null
                                                        ? []
                                                        : [
                                                              {
                                                                  label: school.name,
                                                                  value,
                                                              },
                                                          ];
                                                },
                                            )}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Section>

                <DataTableCard
                    title="School ranking"
                    description="Highest average score first"
                    count={schools.total}
                    noun="school"
                >
                    {schools.data.length === 0 ? (
                        <TableEmptyState
                            icon={Award}
                            title="No schools found"
                            description="No active school matches these filters."
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>School</Th>
                                <Th align="right">Average score</Th>
                                <Th align="right">Pass rate</Th>
                                <Th align="right" hideOnMobile>
                                    Grades
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
                                        <Td
                                            align="right"
                                            className="tabular-nums"
                                        >
                                            {school.average_score ?? '—'}
                                        </Td>
                                        <Td align="right">
                                            {school.pass_rate === null ? (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            ) : (
                                                <StatusBadge
                                                    tone={
                                                        school.pass_rate < 50
                                                            ? 'danger'
                                                            : 'success'
                                                    }
                                                >
                                                    {percent(school.pass_rate)}
                                                </StatusBadge>
                                            )}
                                        </Td>
                                        <Td
                                            align="right"
                                            hideOnMobile
                                            className="tabular-nums"
                                        >
                                            {count(school.grades_recorded)}
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

Performance.layout = {
    breadcrumbs: [{ title: 'Performance', href: ministry.performance() }],
};
