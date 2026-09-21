import { Head, Link } from '@inertiajs/react';
import { History } from 'lucide-react';
import {
    DataTable,
    DataTableCard,
    FilterBar,
    FilterSearch,
    FilterSelect,
    TBody,
    TableEmptyState,
    THead,
    Td,
    Th,
    Tr,
} from '@/components/data-table';
import Heading from '@/components/heading';
import { Pagination } from '@/components/pagination';
import { useListFilters } from '@/hooks/use-list-filters';
import ministry from '@/routes/ministry';
import schools from '@/routes/schools';
import type { Paginated } from '@/types/pagination';
import type { Option } from '@/types/ministry';

type Log = {
    id: string;
    action: string;
    action_label: string;
    actor: string | null;
    subject: string | null;
    subject_type: string | null;
    subject_id: string | null;
    at: string | null;
};

export default function AuditLog({
    logs,
    filters: initialFilters,
    actions,
}: {
    logs: Paginated<Log>;
    filters: { search: string; action: string };
    actions: Option[];
}) {
    const [filters, setFilters] = useListFilters(ministry.auditLog().url, {
        search: initialFilters.search,
        action: initialFilters.action,
    });

    const update = (key: keyof typeof filters, value: string) =>
        setFilters((current) => ({ ...current, [key]: value }));
    const activeCount = Object.values(filters).filter(Boolean).length;

    return (
        <>
            <Head title="Audit log" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Audit log"
                    description="Who did what in the ministry portal, newest first"
                />

                <DataTableCard
                    title="Activity"
                    icon={History}
                    count={logs.total}
                    noun="entry"
                    filters={
                        <FilterBar
                            activeCount={activeCount}
                            onClear={() =>
                                setFilters({ search: '', action: '' })
                            }
                            className="lg:grid-cols-3"
                        >
                            <FilterSearch
                                id="audit-search"
                                value={filters.search}
                                onChange={(value) => update('search', value)}
                                placeholder="Person or school..."
                            />
                            <FilterSelect
                                id="audit-action"
                                label="Action"
                                value={filters.action}
                                onChange={(value) => update('action', value)}
                                allLabel="All actions"
                                options={actions}
                            />
                        </FilterBar>
                    }
                >
                    {logs.data.length === 0 ? (
                        <TableEmptyState
                            icon={History}
                            title="No activity yet"
                            description="Actions taken in the portal will be recorded here."
                        />
                    ) : (
                        <DataTable>
                            <THead>
                                <Th>When</Th>
                                <Th>Who</Th>
                                <Th>Action</Th>
                                <Th>Subject</Th>
                            </THead>
                            <TBody>
                                {logs.data.map((log) => (
                                    <Tr key={log.id}>
                                        <Td muted className="whitespace-nowrap">
                                            {log.at
                                                ? new Date(
                                                      log.at,
                                                  ).toLocaleString()
                                                : '—'}
                                        </Td>
                                        <Td>{log.actor ?? 'Removed user'}</Td>
                                        <Td>{log.action_label}</Td>
                                        <Td>
                                            {log.subject_type ===
                                                'App\\Models\\School' &&
                                            log.subject_id ? (
                                                <Link
                                                    href={schools.show(
                                                        log.subject_id,
                                                    )}
                                                    className="hover:underline"
                                                >
                                                    {log.subject}
                                                </Link>
                                            ) : (
                                                (log.subject ?? '—')
                                            )}
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </DataTable>
                    )}
                    <Pagination
                        links={logs.links}
                        from={logs.from}
                        to={logs.to}
                        total={logs.total}
                    />
                </DataTableCard>
            </div>
        </>
    );
}

AuditLog.layout = {
    breadcrumbs: [{ title: 'Audit log', href: ministry.auditLog() }],
};
