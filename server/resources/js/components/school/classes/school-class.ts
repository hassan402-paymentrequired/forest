import type { RecordStatus } from '@/components/record-status';

export type SchoolClass = {
    id: string;
    name: string;
    status: RecordStatus;
    students_count: number;
    teacher: { id: string; name: string } | null;
};
