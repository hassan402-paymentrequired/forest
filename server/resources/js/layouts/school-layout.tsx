import AppSidebarLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { AppLayoutProps } from '@/types';

export default function SchoolLayout({
    breadcrumbs = [],
    headerActions,
    children,
}: AppLayoutProps) {
    return (
        <AppSidebarLayoutTemplate
            breadcrumbs={breadcrumbs}
            headerActions={headerActions}
        >
            {children}
        </AppSidebarLayoutTemplate>
    );
}
