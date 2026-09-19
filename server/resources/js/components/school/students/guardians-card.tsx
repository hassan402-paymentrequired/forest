import { Mail, Phone, Plus, ShieldCheck, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Guardian = {
    id: number | string;
    name: string;
    relationship: string;
    email?: string | null;
    phone?: string | null;
    is_primary?: boolean;
};

type Props = {
    guardians: Guardian[];
    relationshipLabel: Record<string, string>;
    onAdd?: () => void;
};

function initials(name: string) {
    const parts = name.trim().split(/\s+/);
    return (
        (parts[0]?.[0] ?? '') + (parts.length > 1 ? parts.at(-1)![0] : '')
    ).toUpperCase();
}

export function GuardiansCard({ guardians, relationshipLabel, onAdd }: Props) {
    // Primary guardian always leads the list
    const sorted = [...guardians].sort(
        (a, b) => Number(!!b.is_primary) - Number(!!a.is_primary),
    );

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="text-muted-foreground size-4" />
                    Guardians
                    {guardians.length > 0 && (
                        <span className="text-muted-foreground text-sm font-normal tabular-nums">
                            {guardians.length}
                        </span>
                    )}
                </CardTitle>
                {onAdd && guardians.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={onAdd}>
                        <Plus className="size-4" />
                        Add guardian
                    </Button>
                )}
            </CardHeader>

            <CardContent>
                {guardians.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-8 text-center">
                        <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
                            <Users className="size-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">
                                No guardians linked yet
                            </p>
                            <p className="text-muted-foreground text-sm">
                                Link a guardian so they can receive updates.
                            </p>
                        </div>
                        {onAdd && (
                            <Button size="sm" onClick={onAdd}>
                                <Plus className="size-4" />
                                Add guardian
                            </Button>
                        )}
                    </div>
                ) : (
                    <ul className="divide-y">
                        {sorted.map((guardian) => (
                            <li
                                key={guardian.id}
                                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                            >
                                <div
                                    aria-hidden
                                    className={cn(
                                        'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                                        guardian.is_primary
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground',
                                    )}
                                >
                                    {initials(guardian.name)}
                                </div>

                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <span className="truncate text-sm font-medium">
                                            {guardian.name}
                                        </span>
                                        {guardian.is_primary && (
                                            <Badge variant="secondary">
                                                Primary
                                            </Badge>
                                        )}
                                    </div>

                                    <p className="text-muted-foreground text-xs">
                                        {relationshipLabel[
                                            guardian.relationship
                                        ] ?? guardian.relationship}
                                    </p>

                                    {(guardian.email || guardian.phone) && (
                                        <div className="flex flex-col gap-1 pt-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-4">
                                            {guardian.email && (
                                                <a
                                                    href={`mailto:${guardian.email}`}
                                                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-w-0 items-center gap-1.5 rounded-sm transition-colors outline-none focus-visible:ring-2"
                                                >
                                                    <Mail className="size-3.5 shrink-0" />
                                                    <span className="truncate">
                                                        {guardian.email}
                                                    </span>
                                                </a>
                                            )}
                                            {guardian.phone && (
                                                <a
                                                    href={`tel:${guardian.phone}`}
                                                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex items-center gap-1.5 rounded-sm tabular-nums transition-colors outline-none focus-visible:ring-2"
                                                >
                                                    <Phone className="size-3.5 shrink-0" />
                                                    {guardian.phone}
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
