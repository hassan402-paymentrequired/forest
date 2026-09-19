import type { RecordStatus } from '@/components/record-status';

export type Subject = {
    id: string;
    name: string;
    status: RecordStatus;
    teachers_count: number;
};
