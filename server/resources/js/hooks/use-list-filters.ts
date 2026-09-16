import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

/**
 * Manages local filter state for an index page and pushes a debounced,
 * state-preserving GET request whenever it changes.
 */
export function useListFilters<F extends Record<string, string>>(
    url: string,
    initial: F,
) {
    const [filters, setFilters] = useState<F>(initial);
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;

            return;
        }

        const timeout = setTimeout(() => {
            router.get(
                url,
                Object.fromEntries(
                    Object.entries(filters).filter(([, value]) => value),
                ),
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 300);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    return [filters, setFilters] as const;
}
