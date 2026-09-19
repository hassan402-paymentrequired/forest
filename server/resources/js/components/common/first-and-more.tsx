import { Badge } from '@/components/ui/badge';

/**
 * Shows the first item and a "+N" badge for the rest (listed on hover), so a
 * long list stays on one line in a table cell.
 */
export function FirstAndMore({ items }: { items: string[] }) {
    if (items.length === 0) {
        return <>—</>;
    }

    return (
        <span className="inline-flex items-center gap-1.5">
            {items[0]}
            {items.length > 1 && (
                <Badge variant="secondary" title={items.slice(1).join(', ')}>
                    +{items.length - 1}
                </Badge>
            )}
        </span>
    );
}
