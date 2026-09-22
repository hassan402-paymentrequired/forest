import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, ChevronLeft, XCircle } from 'lucide-react';
import Heading from '@/components/heading';
import { Card, CardContent } from '@/components/ui/card';
import ministry from '@/routes/ministry';
import schools from '@/routes/schools';

type Check = {
    key: string;
    label: string;
    detail: string;
    passes: boolean;
};

type Props = {
    school: {
        id: string;
        name: string;
        lga_label: string | null;
        status: 'active' | 'suspended';
    };
    checks: Check[];
};

export default function DataQualityShow({ school, checks }: Props) {
    const gaps = checks.filter((check) => !check.passes).length;

    return (
        <>
            <Head title={`Data quality — ${school.name}`} />

            <div className="space-y-6 p-4">
                <div>
                    <Link
                        href={ministry.dataQuality()}
                        className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
                    >
                        <ChevronLeft className="size-4" />
                        Data quality
                    </Link>
                    <Heading
                        title={school.name}
                        description={
                            gaps === 0
                                ? 'Every check passes. This school’s numbers can be trusted.'
                                : `${gaps} of ${checks.length} checks need attention`
                        }
                    />
                    <Link
                        href={schools.show(school.id)}
                        className="text-muted-foreground mt-1 inline-block text-sm hover:underline"
                    >
                        {school.lga_label ?? 'No LGA set'} · View school page
                    </Link>
                </div>

                <div className="grid gap-3">
                    {checks.map((check) => (
                        <Card key={check.key}>
                            <CardContent className="flex items-start gap-3">
                                {check.passes ? (
                                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <XCircle className="text-destructive mt-0.5 size-5 shrink-0" />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {check.label}
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        {check.detail}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </>
    );
}

DataQualityShow.layout = {
    breadcrumbs: [
        { title: 'Data quality', href: ministry.dataQuality() },
        { title: 'Breakdown', href: ministry.dataQuality() },
    ],
};
