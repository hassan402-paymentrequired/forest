import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaginationLink } from '@/types/pagination';

type Props = {
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
};

export function Pagination({ links, from, to, total }: Props) {
    if (links.length <= 3) {
        return null;
    }

    const lastIndex = links.length - 1;

    return (
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <p className="text-muted-foreground">
                {from && to
                    ? `Showing ${from}-${to} of ${total}`
                    : `${total} total`}
            </p>
            <div className="flex items-center gap-1">
                {links.map((link, index) => {
                    const isPrev = index === 0;
                    const isNext = index === lastIndex;
                    const content = isPrev ? (
                        <ChevronLeft className="size-4" />
                    ) : isNext ? (
                        <ChevronRight className="size-4" />
                    ) : (
                        <span
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    );

                    if (!link.url) {
                        return (
                            <span
                                key={index}
                                className="text-muted-foreground/40 flex size-8 items-center justify-center"
                            >
                                {content}
                            </span>
                        );
                    }

                    return (
                        <Link
                            key={index}
                            href={link.url}
                            preserveScroll
                            className={cn(
                                'flex size-8 items-center justify-center rounded-md',
                                link.active
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-muted',
                            )}
                        >
                            {content}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
