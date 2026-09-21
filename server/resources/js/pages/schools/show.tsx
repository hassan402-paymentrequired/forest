import { Head, router, setLayoutProps } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import {
    Award,
    BookOpen,
    CalendarCheck2,
    GraduationCap,
    Mail,
    Pencil,
    School as SchoolIcon,
    Shield,
    UserCheck,
    Users,
    UsersRound,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import Heading from '@/components/heading';
import { FlagBadges, IssueBadges } from '@/components/ministry/badges';
import { BarList, TrendChart } from '@/components/ministry/charts';
import {
    SchoolProfileDialog,
    type SchoolProfile,
} from '@/components/ministry/school-profile-dialog';
import { Empty, Section } from '@/components/section';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { count, formatDate, percent } from '@/lib/ministry';
import schools from '@/routes/schools';
import type {
    FilterOptions,
    Flag,
    Issue,
    Option,
    SchoolRow,
} from '@/types/ministry';

type SchoolStatus = 'invited' | 'active' | 'suspended';

const statusLabel: Record<SchoolStatus, string> = {
    invited: 'Invited',
    active: 'Active',
    suspended: 'Suspended',
};

const statusVariant: Record<
    SchoolStatus,
    'default' | 'secondary' | 'destructive'
> = {
    invited: 'secondary',
    active: 'default',
    suspended: 'destructive',
};

type School = SchoolProfile & {
    contact_email: string;
    status: SchoolStatus;
    invited_at: string | null;
    activated_at: string | null;
    invited_by: { name: string; email: string } | null;
};

type Invitation = {
    email: string;
    expires_at: string;
    accepted_at: string | null;
    is_expired: boolean;
};

type Stats = {
    teachers: number;
    classes: number;
    students: number;
};

type Overview = {
    metrics: SchoolRow;
    flags: Flag[];
    issues: Issue[];
    attendance_trend: { week: string; rate: number }[];
    attendance_breakdown: Record<
        'present' | 'absent' | 'late' | 'excused',
        number
    >;
    grade_distribution: Record<'a' | 'b' | 'c' | 'd' | 'f', number>;
    subjects: { subject: string; average: number }[];
    enrolment_by_class: { class: string; students: number }[];
};

const labelOf = (options: Option[], value: string | null) =>
    options.find((option) => option.value === value)?.label ?? '—';

function ProfileRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right">{children}</span>
        </div>
    );
}

export default function SchoolShow({
    school,
    options,
    invitation,
    stats,
    overview,
}: {
    school: School;
    options: FilterOptions;
    invitation: Invitation | null;
    stats: Stats;
    overview: Overview | null;
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Schools', href: schools.index() },
            { title: school.name, href: schools.show(school.id) },
        ],
    });

    const [confirmingSuspend, setConfirmingSuspend] = useState(false);
    const [suspending, setSuspending] = useState(false);
    const [editing, setEditing] = useState(false);

    const handleSuspend = () =>
        router.post(
            schools.suspend(school.id).url,
            {},
            {
                onStart: () => setSuspending(true),
                onFinish: () => {
                    setSuspending(false);
                    setConfirmingSuspend(false);
                },
            },
        );

    const handleReactivate = () => {
        router.post(schools.reactivate(school.id).url);
    };

    const handleResendInvitation = () => {
        router.post(schools.resendInvitation(school.id).url);
    };

    return (
        <>
            <Head title={school.name} />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        title={school.name}
                        description={school.contact_email}
                    />
                    <div className="flex items-center gap-2">
                        <Badge variant={statusVariant[school.status]}>
                            {statusLabel[school.status]}
                        </Badge>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(true)}
                        >
                            <Pencil />
                            Edit
                        </Button>
                        {school.status !== 'suspended' && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setConfirmingSuspend(true)}
                            >
                                Suspend
                            </Button>
                        )}
                        {school.status === 'suspended' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReactivate}
                            >
                                Reactivate
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Teachers"
                        value={stats.teachers}
                        icon={UserCheck}
                    />
                    <StatCard
                        label="Classes"
                        value={stats.classes}
                        icon={GraduationCap}
                    />
                    <StatCard
                        label="Students"
                        value={stats.students}
                        icon={Users}
                    />
                </div>

                {overview && (
                    <>
                        {(overview.flags.length > 0 ||
                            overview.issues.length > 0) && (
                            <div className="grid gap-4 lg:grid-cols-2">
                                <Section
                                    title="On the watchlist because"
                                    icon={Shield}
                                >
                                    {overview.flags.length === 0 ? (
                                        <Empty>Nothing is flagged.</Empty>
                                    ) : (
                                        <FlagBadges flags={overview.flags} />
                                    )}
                                </Section>
                                <Section
                                    title="Gaps in its records"
                                    icon={Shield}
                                >
                                    {overview.issues.length === 0 ? (
                                        <Empty>No gaps found.</Empty>
                                    ) : (
                                        <IssueBadges issues={overview.issues} />
                                    )}
                                </Section>
                            </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard
                                label="Attendance this term"
                                value={percent(
                                    overview.metrics.attendance_rate,
                                )}
                                icon={CalendarCheck2}
                            />
                            <StatCard
                                label="Average score"
                                value={overview.metrics.average_score ?? '—'}
                                icon={Award}
                            />
                            <StatCard
                                label="Pass rate"
                                value={percent(overview.metrics.pass_rate)}
                                icon={GraduationCap}
                            />
                            <StatCard
                                label="Students per teacher"
                                value={
                                    overview.metrics.student_teacher_ratio ??
                                    '—'
                                }
                                icon={UsersRound}
                            />
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Section
                                title="Attendance by week"
                                icon={CalendarCheck2}
                            >
                                <TrendChart
                                    caption="Weekly attendance rate"
                                    domain={[0, 100]}
                                    format={(value) => `${value}%`}
                                    data={overview.attendance_trend.map(
                                        (point) => ({
                                            label: format(
                                                parseISO(point.week),
                                                'd MMM',
                                            ),
                                            value: point.rate,
                                        }),
                                    )}
                                />
                            </Section>

                            <Section title="Grade spread" icon={GraduationCap}>
                                <BarList
                                    emptyLabel="No grades recorded this term."
                                    rows={(
                                        Object.keys(
                                            overview.grade_distribution,
                                        ) as (keyof Overview['grade_distribution'])[]
                                    ).map((letter) => ({
                                        label: `Grade ${letter.toUpperCase()}`,
                                        value: overview.grade_distribution[
                                            letter
                                        ],
                                    }))}
                                />
                            </Section>

                            <Section title="Average by subject" icon={BookOpen}>
                                <BarList
                                    emptyLabel="No grades recorded this term."
                                    max={100}
                                    rows={overview.subjects.map((row) => ({
                                        label: row.subject,
                                        value: row.average,
                                    }))}
                                />
                            </Section>

                            <Section
                                title="Students by class"
                                icon={UsersRound}
                            >
                                <BarList
                                    emptyLabel="No students are enrolled this session."
                                    rows={overview.enrolment_by_class.map(
                                        (row) => ({
                                            label: row.class,
                                            value: row.students,
                                        }),
                                    )}
                                />
                            </Section>
                        </div>
                    </>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <SchoolIcon className="text-muted-foreground size-4" />
                                Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 text-sm">
                            <ProfileRow label="School code">
                                {school.code ?? '—'}
                            </ProfileRow>
                            <ProfileRow label="Type">
                                {labelOf(options.types, school.type)}
                            </ProfileRow>
                            <ProfileRow label="Level">
                                {labelOf(options.levels, school.level)}
                            </ProfileRow>
                            <ProfileRow label="LGA">
                                {labelOf(options.lgas, school.lga)}
                            </ProfileRow>
                            <ProfileRow label="Education district">
                                {labelOf(
                                    options.districts,
                                    school.education_district,
                                )}
                            </ProfileRow>
                            <ProfileRow label="Address">
                                {school.address ?? '—'}
                            </ProfileRow>
                            <ProfileRow label="Invited">
                                {formatDate(school.invited_at)}
                            </ProfileRow>
                            <ProfileRow label="Activated">
                                {formatDate(school.activated_at)}
                            </ProfileRow>
                            <ProfileRow label="Invited by">
                                {school.invited_by
                                    ? `${school.invited_by.name} (${school.invited_by.email})`
                                    : '—'}
                            </ProfileRow>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="text-muted-foreground size-4" />
                                Invitation
                            </CardTitle>
                            {school.status === 'invited' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleResendInvitation}
                                >
                                    Resend Invitation
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="grid gap-2 text-sm">
                            {invitation ? (
                                <>
                                    <ProfileRow label="Sent to">
                                        {invitation.email}
                                    </ProfileRow>
                                    <ProfileRow label="Expires">
                                        {formatDate(invitation.expires_at)}
                                    </ProfileRow>
                                    <ProfileRow label="Status">
                                        {invitation.accepted_at ? (
                                            <Badge variant="default">
                                                Accepted
                                            </Badge>
                                        ) : invitation.is_expired ? (
                                            <Badge variant="destructive">
                                                Expired
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                Pending
                                            </Badge>
                                        )}
                                    </ProfileRow>
                                </>
                            ) : (
                                <p className="text-muted-foreground flex items-center gap-2">
                                    <Shield className="size-4" />
                                    No invitation on record.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <SchoolProfileDialog
                key={editing ? 'open' : 'closed'}
                school={school}
                options={options}
                open={editing}
                onOpenChange={setEditing}
            />

            {confirmingSuspend && (
                <ConfirmDialog
                    open
                    title="Suspend school?"
                    description={`${school.name} will be suspended. Its accounts won't be able to log in until it's reactivated.`}
                    confirmLabel="Suspend"
                    destructive
                    processing={suspending}
                    onConfirm={handleSuspend}
                    onCancel={() => setConfirmingSuspend(false)}
                />
            )}
        </>
    );
}
