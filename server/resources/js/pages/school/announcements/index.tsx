import { Head, router } from '@inertiajs/react';
import { Megaphone } from 'lucide-react';
import { StatusBadge } from '@/components/data-table';
import Heading from '@/components/heading';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/ministry';
import school from '@/routes/school';
import type { Paginated } from '@/types/pagination';

type Announcement = {
    id: string;
    title: string;
    body: string;
    sender: string | null;
    sent_at: string | null;
    read_at: string | null;
};

export default function Announcements({
    announcements,
}: {
    announcements: Paginated<Announcement>;
}) {
    return (
        <>
            <Head title="Announcements" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Announcements"
                    description="Notices from the Ministry of Education"
                />

                {announcements.data.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
                        <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
                            <Megaphone className="size-5" />
                        </div>
                        <p className="text-sm font-medium">
                            No announcements yet
                        </p>
                        <p className="text-muted-foreground text-sm">
                            Notices from the ministry will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {announcements.data.map((announcement) => (
                            <Card key={announcement.id}>
                                <CardHeader className="flex-row items-start justify-between gap-3">
                                    <div className="grid gap-1">
                                        <CardTitle className="flex items-center gap-2">
                                            {announcement.title}
                                            {!announcement.read_at && (
                                                <StatusBadge tone="info">
                                                    New
                                                </StatusBadge>
                                            )}
                                        </CardTitle>
                                        <p className="text-muted-foreground text-xs">
                                            {formatDate(announcement.sent_at)}
                                            {announcement.sender &&
                                                ` · ${announcement.sender}`}
                                        </p>
                                    </div>
                                    {!announcement.read_at && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                router.post(
                                                    school.announcements.read({
                                                        announcement:
                                                            announcement.id,
                                                    }).url,
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            Mark as read
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm whitespace-pre-line">
                                        {announcement.body}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <Pagination
                    links={announcements.links}
                    from={announcements.from}
                    to={announcements.to}
                    total={announcements.total}
                />
            </div>
        </>
    );
}

Announcements.layout = {
    breadcrumbs: [
        { title: 'Announcements', href: school.announcements.index() },
    ],
};
