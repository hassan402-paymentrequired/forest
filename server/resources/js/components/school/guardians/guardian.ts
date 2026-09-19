import type { RecordStatus } from '@/components/record-status';

export type GuardianRelationship = 'father' | 'mother' | 'guardian' | 'other';

export type GuardianChild = {
    id: string;
    name: string;
    admission_number: string | null;
    class_name: string | null;
    relationship: GuardianRelationship;
    is_primary: boolean;
};

export type Guardian = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    added_at: string | null;
    status: RecordStatus;
    relationship: GuardianRelationship | null;
    is_primary: boolean;
    students: GuardianChild[];
};

export const relationshipLabel: Record<GuardianRelationship, string> = {
    father: 'Father',
    mother: 'Mother',
    guardian: 'Guardian',
    other: 'Other',
};

export function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}
