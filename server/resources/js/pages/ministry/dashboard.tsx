import { Head, Link } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import {
    Award,
    CalendarCheck2,
    GraduationCap,
    School as SchoolIcon,
    ShieldAlert,
    Users,
    UserCheck,
    UsersRound,
} from 'lucide-react';
import Heading from '@/components/heading';
import { StatusBadge, type Tone } from '@/components/data-table';
import { FlagBadges } from '@/components/ministry/badges';
import { TrendChart } from '@/components/ministry/charts';
import {
    ScopeFilterBar,
    useScopeFilters,
} from '@/components/ministry/scope-filter-bar';
import { Empty, Section } from '@/components/section';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { count, formatDate, percent } from '@/lib/ministry';
import { dashboard } from '@/routes';
import ministry from '@/routes/ministry';
import schools from '@/routes/schools';
import type {
    Flag,
    FilterOptions,
    ScopeFilters,
    Totals,
} from '@/types/ministry';

type SchoolStatus = 'invited' | 'active' | 'suspended';

const statusTone: Record<SchoolStatus, Tone> = {
    invited: 'info',
    active: 'success',
    suspended: 'danger',
};

const statusLabel: Record<SchoolStatus, string> = {
    invited: 'Invited',
    active: 'Active',
    suspended: 'Suspended',
};

type Props = {
    filters: ScopeFilters;
    options: FilterOptions;
    school_statuses: Record<SchoolStatus, number>;
    totals: Totals;
    attendance_trend: { week: string; rate: number }[];
    watchlist: {
        total: number;
        schools: {
            id: string;
            name: string;
            lga_label: string | null;
            flags: Flag[];
        }[];
    };
    recent_schools: {
        id: string;
        name: string;
        status: SchoolStatus;
        invited_at: string | null;
        activated_at: string | null;
    }[];
};

export default function MinistryDashboard({
    filters,
    options,
    school_statuses: statuses,
    totals,
    attendance_trend: trend,
    watchlist,
    recent_schools: recent,
}: Props) {
    const state = useScopeFilters(dashboard().url, filters);

    return (
        <>
            <Head title="Dashboard" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Dashboard"
                    description="How schools across the state are doing this term"
                />

                <ScopeFilterBar state={state} options={options} />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Schools reporting"
                        value={count(totals.schools)}
                        icon={SchoolIcon}
                    />
                    <StatCard
                        label="Active students"
                        value={count(totals.students)}
                        icon={UsersRound}
                    />
                    <StatCard
                        label="Active teachers"
                        value={count(totals.teachers)}
                        icon={UserCheck}
                    />
                    <StatCard
                        label="Teachers on leave"
                        value={count(totals.teachers_on_leave)}
                        icon={Users}
                    />
                    <StatCard
                        label="Attendance this term"
                        value={percent(totals.attendance_rate)}
                        icon={CalendarCheck2}
                    />
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
                        label="Students per teacher"
                        value={totals.student_teacher_ratio ?? '—'}
                        icon={Users}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Section
                        title="Attendance by week"
                        icon={CalendarCheck2}
                        action={
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={ministry.attendance()}>
                                    Details
                                </Link>
                            </Button>
                        }
                    >
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

                    <Section
                        title="Schools needing attention"
                        icon={ShieldAlert}
                        action={
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={ministry.watchlist()}>
                                    View all ({watchlist.total})
                                </Link>
                            </Button>
                        }
                    >
                        {watchlist.schools.length === 0 ? (
                            <Empty>No school is currently flagged.</Empty>
                        ) : (
                            <ul className="divide-border divide-y">
                                {watchlist.schools.map((school) => (
                                    <li key={school.id} className="py-3">
                                        <Link
                                            href={schools.show(school.id)}
                                            className="text-sm font-medium hover:underline"
                                        >
                                            {school.name}
                                        </Link>
                                        {school.lga_label && (
                                            <span className="text-muted-foreground ml-2 text-xs">
                                                {school.lga_label}
                                            </span>
                                        )}
                                        <div className="mt-1.5">
                                            <FlagBadges flags={school.flags} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>
                </div>

                <Section
                    title="Schools on the platform"
                    icon={SchoolIcon}
                    action={
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={schools.index()}>All schools</Link>
                        </Button>
                    }
                >
                    <div className="mb-4 flex flex-wrap gap-2">
                        {(Object.keys(statuses) as SchoolStatus[]).map(
                            (status) => (
                                <StatusBadge
                                    key={status}
                                    tone={statusTone[status]}
                                >
                                    {statuses[status]} {statusLabel[status]}
                                </StatusBadge>
                            ),
                        )}
                    </div>
                    {recent.length === 0 ? (
                        <Empty>Schools you invite will show up here.</Empty>
                    ) : (
                        <ul className="divide-border divide-y">
                            {recent.map((school) => (
                                <li
                                    key={school.id}
                                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                                >
                                    <Link
                                        href={schools.show(school.id)}
                                        className="font-medium hover:underline"
                                    >
                                        {school.name}
                                    </Link>
                                    <span className="text-muted-foreground flex items-center gap-3 text-xs">
                                        {school.status === 'invited'
                                            ? `Invited ${formatDate(school.invited_at)}`
                                            : `Joined ${formatDate(school.activated_at)}`}
                                        <StatusBadge
                                            tone={statusTone[school.status]}
                                        >
                                            {statusLabel[school.status]}
                                        </StatusBadge>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
            </div>
        </>
    );
}

MinistryDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
