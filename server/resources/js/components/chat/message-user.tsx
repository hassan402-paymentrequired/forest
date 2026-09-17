import { Check, Copy } from 'lucide-react';
import {
    MessageAction,
    MessageActions,
    Message as MessageContainer,
    MessageContent,
} from '@/components/prompt-kit/message';
import { cn } from '@/lib/utils';

export type MessageUserProps = {
    hasScrollAnchor?: boolean;
    children: string;
    copied: boolean;
    copyToClipboard: () => void;
    className?: string;
};

export function MessageUser({
    hasScrollAnchor,
    children,
    copied,
    copyToClipboard,
    className,
}: MessageUserProps) {
    return (
        <MessageContainer
            className={cn(
                'group flex w-full max-w-3xl flex-col items-end gap-0.5 px-6 pb-2',
                hasScrollAnchor && 'min-h-scroll-anchor',
                className,
            )}
        >
            <MessageContent className="bg-accent prose dark:prose-invert relative max-w-[70%] rounded-3xl px-5 py-2.5">
                {children}
            </MessageContent>
            <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-0 group-hover:opacity-100">
                <MessageAction
                    tooltip={copied ? 'Copied!' : 'Copy text'}
                    side="bottom"
                >
                    <button
                        className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
                        aria-label="Copy text"
                        onClick={copyToClipboard}
                        type="button"
                    >
                        {copied ? (
                            <Check className="size-4" />
                        ) : (
                            <Copy className="size-4" />
                        )}
                    </button>
                </MessageAction>
            </MessageActions>
        </MessageContainer>
    );
}
