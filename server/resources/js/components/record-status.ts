import type { Tone } from '@/components/data-table';

export type RecordStatus = 'active' | 'inactive';

export const recordStatusLabel: Record<RecordStatus, string> = {
    active: 'Active',
    inactive: 'Inactive',
};

export const recordStatusTone: Record<RecordStatus, Tone> = {
    active: 'success',
    inactive: 'danger',
};
