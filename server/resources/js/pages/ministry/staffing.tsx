import { Head } from '@inertiajs/react';
import { BookOpen, LayoutList, UserCheck, Users, UserX } from 'lucide-react';
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
import {
    ScopeFilterBar,
    useScopeFilters,
} from '@/components/ministry/scope-filter-bar';
import { SchoolCell } from '@/components/ministry/school-cell';
import { Pagination } from '@/components/pagination';
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
    totals: Totals;
    threshold: number;
    understaffed_count: number;
    uncovered: { classes: number; subjects: number };
    schools: Paginated<SchoolRow>;
};

export default function Staffing({
    filters,
    options,
    totals,
    threshold,
    understaffed_count: understaffed,
    uncovered,
    schools,
}: Props) {
    const state = useScopeFilters(ministry.staffing().url, filters);

    return (
        <>
            <Head title="Staffing" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Staffing"
                    description={`Schools with more than ${threshold} students per teacher are counted as understaffed`}
                />

                <ScopeFilterBar state={state} options={options} />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <StatCard
                        label="Active teachers"
                        value={count(totals.teachers)}
                        icon={UserCheck}
                    />
                    <StatCard
                        label="On leave"
                        value={count(totals.teachers_on_leave)}
                        icon={UserX}
                    />
                    <StatCard
                        label="Students per teacher"
                        value={totals.student_teacher_ratio ?? '—'}
                        icon={Users}
                    />
                    <StatCard
                        label="Understaffed schools"
                        value={count(understaffed)}
                        icon={Users}
                    />
                    <StatCard
                        label="Classes without a teacher"
                        value={count(uncovered.classes)}
                        icon={LayoutList}
                    />
                </div>

                <DataTableCard
                    title="Schools by staffing pressure"
                    description="Most stretched first"
                    count={schools.total}
                    noun="school"
                >
                    {schools.data.length === 0 ? (
                        <TableEmptyState
                            icon={Users}
                            title="No schools found"
                            description="No active school matches these filters."
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>School</Th>
                                <Th align="right">Students</Th>
                                <Th align="right">Teachers</Th>
                                <Th align="right" hideOnMobile>
                                    On leave
                                </Th>
                                <Th align="right">Per teacher</Th>
                                <Th align="right" hideOnMobile>
                                    <span className="inline-flex items-center gap-1">
                                        <LayoutList className="size-3.5" />
                                        Classes uncovered
                                    </span>
                                </Th>
                                <Th align="right" hideOnMobile>
                                    <span className="inline-flex items-center gap-1">
                                        <BookOpen className="size-3.5" />
                                        Subjects uncovered
                                    </span>
                                </Th>
                            </THead>
                            <TBody>
                                {schools.data.map((school) => {
                                    const stretched =
                                        school.teachers_active === 0
                                            ? school.students_active > 0
                                            : (school.student_teacher_ratio ??
                                                  0) > threshold;

                                    return (
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
                                                className="tabular-nums"
                                            >
                                                {count(school.teachers_active)}
                                            </Td>
                                            <Td
                                                align="right"
                                                hideOnMobile
                                                className="tabular-nums"
                                            >
                                                {count(
                                                    school.teachers_on_leave,
                                                )}
                                            </Td>
                                            <Td align="right">
                                                {stretched ? (
                                                    <StatusBadge tone="danger">
                                                        {school.student_teacher_ratio ??
                                                            'No teachers'}
                                                    </StatusBadge>
                                                ) : (
                                                    <span className="tabular-nums">
                                                        {school.student_teacher_ratio ??
                                                            '—'}
                                                    </span>
                                                )}
                                            </Td>
                                            <Td
                                                align="right"
                                                hideOnMobile
                                                className="tabular-nums"
                                            >
                                                {count(
                                                    school.classes_without_teacher,
                                                )}
                                            </Td>
                                            <Td
                                                align="right"
                                                hideOnMobile
                                                className="tabular-nums"
                                            >
                                                {count(
                                                    school.subjects_without_teacher,
                                                )}
                                            </Td>
                                        </Tr>
                                    );
                                })}
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

Staffing.layout = {
    breadcrumbs: [{ title: 'Staffing', href: ministry.staffing() }],
};
