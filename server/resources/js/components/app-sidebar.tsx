import { Link, usePage } from '@inertiajs/react';
import {
    Award,
    BookOpen,
    CalendarCheck2,
    CalendarRange,
    GraduationCap,
    LayoutGrid,
    Megaphone,
    Sparkles,
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
import ai from '@/routes/ai';
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
        title: 'Assistant',
        href: ai.chat(),
        icon: Sparkles,
    },
    {
        title: 'Announcements',
        href: school.announcements.index(),
        icon: Megaphone,
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
    const { unreadAnnouncements } = usePage<{ unreadAnnouncements: number }>()
        .props;

    const items = mainNavItems.map((item) =>
        item.title === 'Announcements'
            ? { ...item, badge: unreadAnnouncements }
            : item,
    );

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
                <NavMain items={items} />
            </SidebarContent>

            <SidebarFooter>
                <SchoolNavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
