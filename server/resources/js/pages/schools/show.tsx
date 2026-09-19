import { Head, router, setLayoutProps } from '@inertiajs/react';
import {
    GraduationCap,
    Mail,
    School as SchoolIcon,
    Shield,
    UserCheck,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import Heading from '@/components/heading';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import schools from '@/routes/schools';

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

function formatDate(value: string | null) {
    return value
        ? new Date(value).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          })
        : '—';
}

type School = {
    id: string;
    name: string;
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

export default function SchoolShow({
    school,
    invitation,
    stats,
}: {
    school: School;
    invitation: Invitation | null;
    stats: Stats;
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Schools', href: schools.index() },
            { title: school.name, href: schools.show(school.id) },
        ],
    });

    const [confirmingSuspend, setConfirmingSuspend] = useState(false);
    const [suspending, setSuspending] = useState(false);

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

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <SchoolIcon className="text-muted-foreground size-4" />
                                Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Invited
                                </span>
                                <span>{formatDate(school.invited_at)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Activated
                                </span>
                                <span>{formatDate(school.activated_at)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Invited By
                                </span>
                                <span>
                                    {school.invited_by
                                        ? `${school.invited_by.name} (${school.invited_by.email})`
                                        : '—'}
                                </span>
                            </div>
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
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Sent To
                                        </span>
                                        <span>{invitation.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Expires
                                        </span>
                                        <span>
                                            {formatDate(invitation.expires_at)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Status
                                        </span>
                                        <span className="flex items-center gap-1">
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
                                        </span>
                                    </div>
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
