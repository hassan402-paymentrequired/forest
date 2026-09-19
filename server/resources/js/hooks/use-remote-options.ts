import { useEffect, useState } from 'react';
import type { MultiSelectOption } from '@/components/ui/multi-select';

/**
 * Fetches picker options from a JSON search endpoint as the user types, so a
 * list too large to load up front can still be searched. Nothing is requested
 * until `setQuery` is first called (i.e. the picker opens).
 */
export function useRemoteOptions<Row>(
    endpoint: (query: string) => string,
    toOption: (row: Row) => MultiSelectOption,
) {
    const [options, setOptions] = useState<MultiSelectOption[]>([]);
    const [query, setQuery] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (query === null) {
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setFailed(false);

        const timer = setTimeout(
            async () => {
                try {
                    const response = await fetch(endpoint(query), {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    });

                    if (!response.ok) {
                        throw new Error(`Search failed (${response.status})`);
                    }

                    const body: { data: Row[] } = await response.json();

                    setOptions(body.data.map(toOption));
                    setLoading(false);
                } catch {
                    if (!controller.signal.aborted) {
                        setOptions([]);
                        setFailed(true);
                        setLoading(false);
                    }
                }
            },
            query === '' ? 0 : 250,
        );

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
        // The endpoint and mapper are stable per picker; only the query drives a fetch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    return { options, loading, failed, setQuery };
}
