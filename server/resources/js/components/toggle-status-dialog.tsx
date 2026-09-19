import { router } from '@inertiajs/react';
import { Power, PowerOff } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

type Labels = {
    /** Name of the thing whose status changes, e.g. "teacher". */
    noun: string;
    /** Label for moving to the inactive state. */
    deactivateLabel?: string;
    /** Label for moving back to the active state. */
    activateLabel?: string;
    /** Wording for the inactive state in the sentence, e.g. "withdrawn". */
    inactiveText?: string;
};

/**
 * Confirms, then flips a record between its active and inactive status.
 * Renders nothing until a record is passed in.
 */
export function ToggleStatusDialog({
    record,
    url,
    active,
    onClose,
    noun,
    deactivateLabel = 'Deactivate',
    activateLabel = 'Activate',
    inactiveText = 'inactive',
    activeValue = 'active',
    inactiveValue = 'inactive',
}: Labels & {
    record: { name: string } | null;
    /** Endpoint of the record's status update. */
    url: string;
    /** Whether the record is currently active. */
    active: boolean;
    onClose: () => void;
    activeValue?: string;
    inactiveValue?: string;
}) {
    const [processing, setProcessing] = useState(false);

    if (!record) {
        return null;
    }

    return (
        <ConfirmDialog
            open
            title={`${active ? deactivateLabel : activateLabel} ${noun}?`}
            description={`${record.name} will be marked as ${active ? inactiveText : 'active'}.`}
            confirmLabel={active ? deactivateLabel : activateLabel}
            destructive={active}
            processing={processing}
            onConfirm={() =>
                router.patch(
                    url,
                    { status: active ? inactiveValue : activeValue },
                    {
                        preserveScroll: true,
                        onStart: () => setProcessing(true),
                        onFinish: () => {
                            setProcessing(false);
                            onClose();
                        },
                    },
                )
            }
            onCancel={onClose}
        />
    );
}

/** The row-menu item that opens a ToggleStatusDialog. */
export function StatusActionItem({
    active,
    onClick,
    deactivateLabel = 'Deactivate',
    activateLabel = 'Activate',
    deactivateIcon = <PowerOff />,
    activateIcon = <Power />,
}: {
    active: boolean;
    onClick: () => void;
    deactivateLabel?: string;
    activateLabel?: string;
    deactivateIcon?: ReactNode;
    activateIcon?: ReactNode;
}) {
    return (
        <DropdownMenuItem onClick={onClick}>
            {active ? deactivateIcon : activateIcon}
            {active ? deactivateLabel : activateLabel}
        </DropdownMenuItem>
    );
}
