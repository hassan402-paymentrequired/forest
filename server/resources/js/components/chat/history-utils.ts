import type { ThreadSummary } from '@/components/chat/command-history';

type TimeGroup = {
    name: string;
    threads: ThreadSummary[];
};

export function groupThreadsByDate(
    threads: ThreadSummary[],
    searchQuery: string,
): TimeGroup[] | null {
    if (searchQuery) return null;

    const now = new Date();
    const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
    ).getTime();
    const weekAgo = today - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = today - 30 * 24 * 60 * 60 * 1000;
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

    const todayThreads: ThreadSummary[] = [];
    const last7DaysThreads: ThreadSummary[] = [];
    const last30DaysThreads: ThreadSummary[] = [];
    const thisYearThreads: ThreadSummary[] = [];
    const olderThreads: Record<number, ThreadSummary[]> = {};

    threads.forEach((thread) => {
        const timestamp = new Date(thread.updated_at).getTime();

        if (timestamp >= today) {
            todayThreads.push(thread);
        } else if (timestamp >= weekAgo) {
            last7DaysThreads.push(thread);
        } else if (timestamp >= monthAgo) {
            last30DaysThreads.push(thread);
        } else if (timestamp >= yearStart) {
            thisYearThreads.push(thread);
        } else {
            const year = new Date(thread.updated_at).getFullYear();
            (olderThreads[year] ??= []).push(thread);
        }
    });

    const result: TimeGroup[] = [];

    if (todayThreads.length > 0) {
        result.push({ name: 'Today', threads: todayThreads });
    }
    if (last7DaysThreads.length > 0) {
        result.push({ name: 'Last 7 days', threads: last7DaysThreads });
    }
    if (last30DaysThreads.length > 0) {
        result.push({ name: 'Last 30 days', threads: last30DaysThreads });
    }
    if (thisYearThreads.length > 0) {
        result.push({ name: 'This year', threads: thisYearThreads });
    }

    Object.entries(olderThreads)
        .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
        .forEach(([year, yearThreads]) => {
            result.push({ name: year, threads: yearThreads });
        });

    return result;
}

export function formatRelativeDate(dateString?: string | null): string {
    if (!dateString) return 'No date';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
        if (diffMinutes < 1) return 'Just now';
        return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }

    if (diffDays < 7) {
        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }

    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
        });
    }

    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}
