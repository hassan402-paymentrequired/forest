import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { MinistryAppSidebar } from '@/components/ministry/app-sidebar';
import type { AppLayoutProps } from '@/types';

export default function MinistryLayout({
    breadcrumbs = [],
    headerActions,
    children,
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <MinistryAppSidebar />
            <AppContent variant="sidebar" className="min-w-0 overflow-x-clip">
                <AppSidebarHeader
                    breadcrumbs={breadcrumbs}
                    actions={headerActions}
                />
                {children}
            </AppContent>
        </AppShell>
    );
}
