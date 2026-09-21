import type { ReactNode } from 'react';
import { FilterBar, FilterSelect } from '@/components/data-table';
import { useListFilters } from '@/hooks/use-list-filters';
import type { FilterOptions, ScopeFilters } from '@/types/ministry';

/**
 * State for the filter row above a ministry page. Extra page-specific filters
 * (e.g. the watchlist's flag) ride along in `initial`; a change re-requests
 * the page, keeping the values and dropping pagination.
 */
export function useScopeFilters<
    F extends ScopeFilters & Record<string, string>,
>(url: string, initial: F) {
    const [filters, setFilters] = useListFilters(url, initial);

    const update = (key: keyof F, value: string) =>
        setFilters((current) => ({ ...current, [key]: value }));

    const clear = () =>
        setFilters(
            (current) =>
                Object.fromEntries(
                    Object.keys(current).map((key) => [key, '']),
                ) as F,
        );

    return {
        filters,
        update,
        clear,
        activeCount: Object.values(filters).filter(Boolean).length,
    };
}

type ScopeFilterState = {
    filters: ScopeFilters;
    update: (key: keyof ScopeFilters, value: string) => void;
    clear: () => void;
    activeCount: number;
};

/** The one filter row every ministry analytics page shares. */
export function ScopeFilterBar({
    state,
    options,
    children,
}: {
    state: ScopeFilterState;
    options: FilterOptions;
    /** Extra, page-specific filters shown after the shared ones. */
    children?: ReactNode;
}) {
    const { filters, update, clear, activeCount } = state;

    return (
        <div className="overflow-hidden rounded-xl border">
            <FilterBar
                activeCount={activeCount}
                onClear={clear}
                className="lg:grid-cols-4"
            >
                <FilterSelect
                    id="filter-lga"
                    label="LGA"
                    value={filters.lga}
                    onChange={(value) => update('lga', value)}
                    allLabel="All LGAs"
                    options={options.lgas}
                />
                <FilterSelect
                    id="filter-district"
                    label="Education district"
                    value={filters.education_district}
                    onChange={(value) => update('education_district', value)}
                    allLabel="All districts"
                    options={options.districts}
                />
                <FilterSelect
                    id="filter-type"
                    label="Type"
                    value={filters.type}
                    onChange={(value) => update('type', value)}
                    allLabel="All types"
                    options={options.types}
                />
                <FilterSelect
                    id="filter-level"
                    label="Level"
                    value={filters.level}
                    onChange={(value) => update('level', value)}
                    allLabel="All levels"
                    options={options.levels}
                />
                {children}
            </FilterBar>
        </div>
    );
}
