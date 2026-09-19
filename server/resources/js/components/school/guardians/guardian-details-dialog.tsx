import { Link } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { CalendarDays, ExternalLink, Mail, Pencil, Phone } from 'lucide-react';
import { StatusBadge } from '@/components/data-table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import guardians from '@/routes/guardians';
import students from '@/routes/students';
import {
    recordStatusLabel,
    recordStatusTone,
} from '@/components/record-status';
import { initials, relationshipLabel } from './guardian';
import type { Guardian } from './guardian';

function DetailRow({
    icon: Icon,
    label,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
                <Icon className="size-4" />
            </div>
            <div className="min-w-0">
                <p className="text-muted-foreground text-xs">{label}</p>
                <div className="text-sm font-medium wrap-break-word">
                    {children}
                </div>
            </div>
        </div>
    );
}

const notProvided = (
    <span className="text-muted-foreground font-normal">Not provided</span>
);

export function GuardianDetailsDialog({
    guardian,
    onClose,
    onEdit,
}: {
    guardian: Guardian;
    onClose: () => void;
    onEdit: () => void;
}) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="size-12">
                            <AvatarFallback>
                                {initials(guardian.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 text-left">
                            <DialogTitle>{guardian.name}</DialogTitle>
                            <DialogDescription asChild>
                                <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge
                                        tone={recordStatusTone[guardian.status]}
                                    >
                                        {recordStatusLabel[guardian.status]}
                                    </StatusBadge>
                                    {guardian.relationship && (
                                        <StatusBadge tone="neutral">
                                            {
                                                relationshipLabel[
                                                    guardian.relationship
                                                ]
                                            }
                                        </StatusBadge>
                                    )}
                                    {guardian.is_primary && (
                                        <StatusBadge tone="success">
                                            Primary contact
                                        </StatusBadge>
                                    )}
                                </div>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    <DetailRow icon={Mail} label="Email">
                        {guardian.email ? (
                            <a
                                href={`mailto:${guardian.email}`}
                                className="hover:underline"
                            >
                                {guardian.email}
                            </a>
                        ) : (
                            notProvided
                        )}
                    </DetailRow>
                    <DetailRow icon={Phone} label="Phone">
                        {guardian.phone ? (
                            <a
                                href={`tel:${guardian.phone}`}
                                className="hover:underline"
                            >
                                {guardian.phone}
                            </a>
                        ) : (
                            notProvided
                        )}
                    </DetailRow>
                    {guardian.added_at && (
                        <DetailRow icon={CalendarDays} label="Added">
                            {format(parseISO(guardian.added_at), 'd MMM yyyy')}
                        </DetailRow>
                    )}
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-semibold">
                        Children ({guardian.students.length})
                    </h3>
                    {guardian.students.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            No students linked yet.
                        </p>
                    ) : (
                        <ul className="divide-border max-h-56 divide-y overflow-y-auto rounded-md border">
                            {guardian.students.map((student) => (
                                <li
                                    key={student.id}
                                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                                >
                                    <Link
                                        href={students.show(student.id)}
                                        className="min-w-0 hover:underline"
                                    >
                                        <div className="truncate font-medium">
                                            {student.name}
                                        </div>
                                        <div className="text-muted-foreground truncate text-xs">
                                            {[
                                                student.admission_number,
                                                student.class_name,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ') ||
                                                'No admission number'}
                                        </div>
                                    </Link>
                                    <div className="flex shrink-0 items-center gap-1.5">
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
                </div>

                <DialogFooter>
                    <Button variant="outline" asChild>
                        <Link href={guardians.show(guardian)}>
                            <ExternalLink />
                            Open full page
                        </Link>
                    </Button>
                    <Button onClick={onEdit}>
                        <Pencil />
                        Edit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
