import type { Tone } from '@/components/data-table';

export type TeacherStatus = 'active' | 'on_leave' | 'transferred' | 'inactive';

export type SubjectOption = {
    id: string;
    name: string;
};

export type ClassOption = {
    id: string;
    name: string;
};

export type Teacher = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    joined_at: string | null;
    subjects: SubjectOption[];
    classes: ClassOption[];
    status: TeacherStatus;
};

export const statusLabel: Record<TeacherStatus, string> = {
    active: 'Active',
    on_leave: 'On Leave',
    transferred: 'Transferred',
    inactive: 'Inactive',
};

export const statusTone: Record<TeacherStatus, Tone> = {
    active: 'success',
    on_leave: 'warning',
    transferred: 'info',
    inactive: 'danger',
};
