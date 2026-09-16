import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
    label: string;
    value: string | number;
    icon: LucideIcon;
};

export function StatCard({ label, value, icon: Icon }: Props) {
    return (
        <Card className='py-2'>
            <CardContent className="flex items-center gap-3.5 p-3.5">
                <div className="bg-muted flex size-[34px] shrink-0 items-center justify-center rounded-full">
                    <Icon className="size-4" />
                </div>
                <div className="bg-border self-stretch w-px" />
                <div className="flex min-w-0 flex-col justify-center">
                    <span className="truncate text-xl font-semibold leading-tight">
                        {value}
                    </span>
                    <span className="text-muted-foreground mt-0.5 truncate text-[12.5px]">
                        {label}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}