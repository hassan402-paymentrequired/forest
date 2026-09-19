import type { Tone } from '@/components/data-table';

export type StudentStatus =
    'active' | 'graduated' | 'transferred' | 'withdrawn';

export const studentStatusLabel: Record<StudentStatus, string> = {
    active: 'Active',
    graduated: 'Graduated',
    transferred: 'Transferred',
    withdrawn: 'Withdrawn',
};

export const studentStatusTone: Record<StudentStatus, Tone> = {
    active: 'success',
    graduated: 'info',
    transferred: 'warning',
    withdrawn: 'danger',
};

/** How the quick status action reads for students: withdraw or reactivate. */
export const studentStatusAction = {
    noun: 'student',
    deactivateLabel: 'Withdraw',
    activateLabel: 'Reactivate',
    inactiveText: 'withdrawn',
    inactiveValue: 'withdrawn',
} as const;
