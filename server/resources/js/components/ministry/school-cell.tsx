import { Link } from '@inertiajs/react';
import schools from '@/routes/schools';

/** A school's name as a link to its page, with its area underneath. */
export function SchoolCell({
    id,
    name,
    area,
}: {
    id: string;
    name: string;
    area?: string | null;
}) {
    return (
        <div className="min-w-0">
            <Link
                href={schools.show(id)}
                className="font-medium hover:underline"
            >
                {name}
            </Link>
            {area ? (
                <p className="text-muted-foreground text-xs">{area}</p>
            ) : null}
        </div>
    );
}
