import { ToggleStatusDialog } from '@/components/toggle-status-dialog';
import teachers from '@/routes/teachers';
import type { Teacher } from './teacher';

/**
 * Confirms, then flips a teacher between active and inactive. Renders nothing
 * until a teacher is passed in.
 */
export function ToggleTeacherStatusDialog({
    teacher,
    onClose,
}: {
    teacher: Pick<Teacher, 'id' | 'name' | 'status'> | null;
    onClose: () => void;
}) {
    return (
        <ToggleStatusDialog
            record={teacher}
            url={teacher ? teachers.status.update(teacher).url : ''}
            active={teacher?.status === 'active'}
            noun="teacher"
            onClose={onClose}
        />
    );
}
