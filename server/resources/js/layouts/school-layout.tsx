import AppSidebarLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';

export default function SchoolLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    return (
        <AppSidebarLayoutTemplate breadcrumbs={breadcrumbs}>
            {children}
        </AppSidebarLayoutTemplate>
    );
}
