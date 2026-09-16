import { Link } from '@inertiajs/react';
import {
    GraduationCap,
    LayoutGrid,
    UserRound,
    Users,
    UsersRound,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { SchoolNavUser } from '@/components/school/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import classes from '@/routes/classes';
import guardians from '@/routes/guardians';
import school from '@/routes/school';
import students from '@/routes/students';
import teachers from '@/routes/teachers';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: school.dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Teachers',
        href: teachers.index(),
        icon: Users,
    },
    {
        title: 'Classes',
        href: classes.index(),
        icon: GraduationCap,
    },
    {
        title: 'Students',
        href: students.index(),
        icon: UserRound,
    },
    {
        title: 'Guardians',
        href: guardians.index(),
        icon: UsersRound,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={school.dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <SchoolNavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
