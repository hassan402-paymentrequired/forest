import { useState } from 'react';
import { MessageAssistant } from '@/components/chat/message-assistant';
import { MessageUser } from '@/components/chat/message-user';
import type { ChatVisual } from '@/hooks/use-ai-chat';

type MessageProps = {
    variant: 'user' | 'assistant';
    children: string;
    visuals?: ChatVisual[];
    onSelectOption?: (option: string) => void;
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
    visuals,
    onSelectOption,
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
            visuals={visuals}
            onSelectOption={onSelectOption}
            isLast={isLast}
            hasScrollAnchor={hasScrollAnchor}
            status={status}
            className={className}
        >
            {children}
        </MessageAssistant>
    );
}
