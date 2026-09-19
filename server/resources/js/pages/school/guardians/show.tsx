import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { Pencil, UserCheck, UserX, Users } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '@/components/data-table';
import {
    recordStatusLabel,
    recordStatusTone,
} from '@/components/record-status';
import type { RecordStatus } from '@/components/record-status';
import { EditGuardianDialog } from '@/components/school/guardians/edit-guardian-dialog';
import { Button } from '@/components/ui/button';
import { ToggleStatusDialog } from '@/components/toggle-status-dialog';
import { cn } from '@/lib/utils';
import {
    initials,
    relationshipLabel,
} from '@/components/school/guardians/guardian';
import type { GuardianChild } from '@/components/school/guardians/guardian';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import guardians from '@/routes/guardians';
import students from '@/routes/students';

type Guardian = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    added_at: string | null;
    status: RecordStatus;
};

export default function GuardianShow({
    guardian,
    students: linkedStudents,
}: {
    guardian: Guardian;
    students: GuardianChild[];
}) {
    const [editing, setEditing] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);
    const isActive = guardian.status === 'active';

    setLayoutProps({
        breadcrumbs: [
            { title: 'Guardians', href: guardians.index() },
            { title: guardian.name, href: guardians.show(guardian.id) },
        ],
    });

    return (
        <>
            <Head title={guardian.name} />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-semibold tracking-tight">
                                {guardian.name}
                            </h2>
                            <StatusBadge
                                tone={recordStatusTone[guardian.status]}
                            >
                                {recordStatusLabel[guardian.status]}
                            </StatusBadge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {[
                                guardian.email,
                                guardian.phone,
                                guardian.added_at &&
                                    `Added ${format(parseISO(guardian.added_at), 'd MMM yyyy')}`,
                            ]
                                .filter(Boolean)
                                .join(' · ') || 'No contact details'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setEditing(true)}
                        >
                            <Pencil />
                            Edit
                        </Button>
                        <Button
                            variant="outline"
                            className={cn(
                                isActive &&
                                    'text-destructive hover:text-destructive',
                            )}
                            onClick={() => setTogglingStatus(true)}
                        >
                            {isActive ? <UserX /> : <UserCheck />}
                            {isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="text-muted-foreground size-4" />
                            Children
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {linkedStudents.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No students linked yet.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {linkedStudents.map((student) => (
                                    <li
                                        key={student.id}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <Link
                                            href={students.show(student.id)}
                                            className="flex items-center gap-3 hover:underline"
                                        >
                                            <Avatar>
                                                <AvatarFallback className="text-xs">
                                                    {initials(student.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">
                                                    {student.name}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {[
                                                        student.admission_number,
                                                        student.class_name,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ') ||
                                                        'No admission number'}
                                                </div>
                                            </div>
                                        </Link>
                                        <div className="flex items-center gap-2">
                                            <StatusBadge tone="neutral">
                                                {
                                                    relationshipLabel[
                                                        student.relationship
                                                    ]
                                                }
                                            </StatusBadge>
                                            {student.is_primary && (
                                                <StatusBadge tone="success">
                                                    Primary
                                                </StatusBadge>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            {editing && (
                <EditGuardianDialog
                    guardian={{
                        ...guardian,
                        relationship: linkedStudents[0]?.relationship ?? null,
                        is_primary: linkedStudents[0]?.is_primary ?? false,
                        students: linkedStudents,
                    }}
                    onClose={() => setEditing(false)}
                />
            )}

            <ToggleStatusDialog
                record={togglingStatus ? guardian : null}
                url={guardians.status.update(guardian.id).url}
                active={isActive}
                noun="guardian"
                onClose={() => setTogglingStatus(false)}
            />
        </>
    );
}
