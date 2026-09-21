import { Link } from '@inertiajs/react';
import {
    Activity,
    BookOpenCheck,
    CalendarCheck2,
    FileDown,
    History,
    LayoutGrid,
    Megaphone,
    School,
    ShieldAlert,
    Sparkles,
    UserCog,
    Users,
    UsersRound,
    Map,
    Award,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { MinistryNavUser } from '@/components/ministry/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import ministry from '@/routes/ministry';
import schools from '@/routes/schools';
import type { NavItem } from '@/types';

const overviewItems: NavItem[] = [
    { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
    { title: 'Schools', href: schools.index(), icon: School },
    { title: 'Watchlist', href: ministry.watchlist(), icon: ShieldAlert },
    { title: 'Assistant', href: ministry.assistant(), icon: Sparkles },
];

const monitoringItems: NavItem[] = [
    { title: 'Enrolment', href: ministry.enrolment(), icon: UsersRound },
    { title: 'Staffing', href: ministry.staffing(), icon: Users },
    { title: 'Attendance', href: ministry.attendance(), icon: CalendarCheck2 },
    { title: 'Performance', href: ministry.performance(), icon: Award },
    { title: 'Coverage', href: ministry.coverage(), icon: BookOpenCheck },
    { title: 'Geography', href: ministry.geography(), icon: Map },
    { title: 'Data quality', href: ministry.dataQuality(), icon: Activity },
];

const workItems: NavItem[] = [
    { title: 'Reports', href: ministry.reports.index(), icon: FileDown },
    {
        title: 'Announcements',
        href: ministry.announcements.index(),
        icon: Megaphone,
    },
    { title: 'Team', href: ministry.team.index(), icon: UserCog },
    { title: 'Audit log', href: ministry.auditLog(), icon: History },
];

export function MinistryAppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={overviewItems} label="Overview" />
                <NavMain items={monitoringItems} label="Monitoring" />
                <NavMain items={workItems} label="Administration" />
            </SidebarContent>

            <SidebarFooter>
                <MinistryNavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
