import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
    label: string;
    value: string | number;
    icon: LucideIcon;
};

export function StatCard({ label, value, icon: Icon }: Props) {
    return (
        <Card>
            <CardContent className="flex items-center gap-4">
                <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="text-muted-foreground size-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-muted-foreground truncate text-sm">
                        {label}
                    </p>
                    <p className="text-2xl font-semibold">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
