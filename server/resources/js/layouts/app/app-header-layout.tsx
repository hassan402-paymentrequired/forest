import { AiSidebar } from '@/components/ai-sidebar';
import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import type { AppLayoutProps } from '@/types';

export default function AppHeaderLayout({
    children,
    breadcrumbs,
}: AppLayoutProps) {
    return (
        <AppShell variant="header">
            <AppHeader breadcrumbs={breadcrumbs} />
            <div className="flex flex-1 overflow-hidden">
                <AppContent variant="header">{children}</AppContent>
                <AiSidebar className='border-sidebar-border/70 dark:border-sidebar-border border-l'/>
            </div>
        </AppShell>
    );
}
