import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function Bar({
    value,
    className,
}: {
    value: number;
    className?: string;
}) {
    return (
        <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
            <div
                className={cn('h-full rounded-full', className)}
                style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
            />
        </div>
    );
}

export function Section({
    title,
    icon: Icon,
    action,
    children,
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Icon className="text-muted-foreground size-4" />
                    {title}
                </CardTitle>
                {action}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

export function Empty({ children }: { children: ReactNode }) {
    return <p className="text-muted-foreground text-sm">{children}</p>;
}
