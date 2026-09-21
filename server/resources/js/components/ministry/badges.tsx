import { StatusBadge } from '@/components/data-table';
import type { Flag, Issue } from '@/types/ministry';

/** The reasons a school is on the watchlist, each with why on hover. */
export function FlagBadges({ flags }: { flags: Flag[] }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {flags.map((flag) => (
                <span key={flag.key} title={flag.reason}>
                    <StatusBadge tone="warning">{flag.label}</StatusBadge>
                </span>
            ))}
        </div>
    );
}

/** The data-quality gaps a school has, each with detail on hover. */
export function IssueBadges({ issues }: { issues: Issue[] }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {issues.map((issue) => (
                <span key={issue.key} title={issue.detail}>
                    <StatusBadge tone="info">{issue.label}</StatusBadge>
                </span>
            ))}
        </div>
    );
}
