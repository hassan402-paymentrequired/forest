import { Link } from '@inertiajs/react';
import {
    Award,
    BookOpen,
    CalendarCheck2,
    CalendarRange,
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
import academicSessions from '@/routes/academic-sessions';
import attendance from '@/routes/attendance';
import classes from '@/routes/classes';
import grades from '@/routes/grades';
import guardians from '@/routes/guardians';
import school from '@/routes/school';
import students from '@/routes/students';
import subjects from '@/routes/subjects';
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
        title: 'Attendance',
        href: attendance.index(),
        icon: CalendarCheck2,
    },
    {
        title: 'Guardians',
        href: guardians.index(),
        icon: UsersRound,
    },
    {
        title: 'Subjects',
        href: subjects.index(),
        icon: BookOpen,
    },
    {
        title: 'Grades',
        href: grades.index(),
        icon: Award,
    },
    {
        title: 'Academic Terms',
        href: academicSessions.index(),
        icon: CalendarRange,
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
