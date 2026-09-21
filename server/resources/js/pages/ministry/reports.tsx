import { Head } from '@inertiajs/react';
import { FileDown } from 'lucide-react';
import Heading from '@/components/heading';
import {
    ScopeFilterBar,
    useScopeFilters,
} from '@/components/ministry/scope-filter-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ministry from '@/routes/ministry';
import type { FilterOptions, ScopeFilters } from '@/types/ministry';

type Props = {
    filters: ScopeFilters;
    options: FilterOptions;
    reports: { key: string; label: string; description: string }[];
};

export default function Reports({ filters, options, reports }: Props) {
    const state = useScopeFilters(ministry.reports.index().url, filters);

    const query = Object.fromEntries(
        Object.entries(state.filters).filter(([, value]) => value),
    );

    return (
        <>
            <Head title="Reports" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Reports"
                    description="Download any report as a CSV. The filters below narrow every download."
                />

                <ScopeFilterBar state={state} options={options} />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {reports.map((report) => (
                        <Card key={report.key}>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {report.label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex h-full flex-col justify-between gap-4">
                                <p className="text-muted-foreground text-sm">
                                    {report.description}
                                </p>
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={
                                            ministry.reports.download(
                                                {
                                                    report: report.key,
                                                },
                                                { query },
                                            ).url
                                        }
                                    >
                                        <FileDown />
                                        Download CSV
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </>
    );
}

Reports.layout = {
    breadcrumbs: [{ title: 'Reports', href: ministry.reports.index() }],
};
