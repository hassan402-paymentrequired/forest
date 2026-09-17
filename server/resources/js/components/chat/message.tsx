import { useState } from 'react';
import { MessageAssistant } from '@/components/chat/message-assistant';
import { MessageUser } from '@/components/chat/message-user';

type MessageProps = {
    variant: 'user' | 'assistant';
    children: string;
    id: string;
    isLast?: boolean;
    onReload: () => void;
    hasScrollAnchor?: boolean;
    status?: 'streaming' | 'ready' | 'submitted' | 'error';
    className?: string;
};

export function Message({
    variant,
    children,
    isLast,
    onReload,
    hasScrollAnchor,
    status,
    className,
}: MessageProps) {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        void navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 500);
    };

    if (variant === 'user') {
        return (
            <MessageUser
                copied={copied}
                copyToClipboard={copyToClipboard}
                hasScrollAnchor={hasScrollAnchor}
                className={className}
            >
                {children}
            </MessageUser>
        );
    }

    return (
        <MessageAssistant
            copied={copied}
            copyToClipboard={copyToClipboard}
            onReload={onReload}
            isLast={isLast}
            hasScrollAnchor={hasScrollAnchor}
            status={status}
            className={className}
        >
            {children}
        </MessageAssistant>
    );
}
