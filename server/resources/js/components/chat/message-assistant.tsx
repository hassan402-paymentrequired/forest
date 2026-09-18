import { RotateCcw, Check, Copy } from 'lucide-react';
import { MessageVisuals } from '@/components/chat/message-visuals';
import {
    MessageAction,
    MessageActions,
    Message,
    MessageContent,
} from '@/components/prompt-kit/message';
import type { ChatVisual } from '@/hooks/use-ai-chat';
import { cn } from '@/lib/utils';

// The placeholder reply (and any small local model, once one is wired up)
// can wrap its entire plain-English reply in a single markdown code fence —
// react-markdown then renders that as one large bordered code block, which
// reads as broken UI for what's meant to be a normal chat answer. Strip a
// fence that wraps the WHOLE message; leave real, partial code blocks alone.
function stripWrappingCodeFence(text: string): string {
    const match = text.trim().match(/^```[a-zA-Z]*\n([\s\S]*?)\n?```$/);
    return match ? match[1] : text;
}

type MessageAssistantProps = {
    children: string;
    visuals?: ChatVisual[];
    onSelectOption?: (option: string) => void;
    isLast?: boolean;
    hasScrollAnchor?: boolean;
    copied?: boolean;
    copyToClipboard?: () => void;
    onReload?: () => void;
    status?: 'streaming' | 'ready' | 'submitted' | 'error';
    className?: string;
};

export function MessageAssistant({
    children,
    visuals = [],
    onSelectOption,
    isLast,
    hasScrollAnchor,
    copied,
    copyToClipboard,
    onReload,
    status,
    className,
}: MessageAssistantProps) {
    const contentNullOrEmpty = children === null || children === '';
    const isLastStreaming = status === 'streaming' && isLast;

    return (
        <Message
            className={cn(
                'group flex w-full max-w-3xl flex-1 items-start gap-4 px-6 pb-2',
                hasScrollAnchor && 'min-h-scroll-anchor',
                className,
            )}
        >
            <div
                className={cn(
                    'relative flex min-w-full flex-col gap-2',
                    isLast && 'pb-8',
                )}
            >
                <MessageVisuals
                    visuals={visuals}
                    canAnswer={Boolean(isLast) && status === 'ready'}
                    onSelectOption={onSelectOption}
                />

                {contentNullOrEmpty ? null : (
                    <MessageContent
                        className={cn(
                            'prose dark:prose-invert relative min-w-full bg-transparent p-0',
                            'prose-h1:scroll-m-20 prose-h1:text-2xl prose-h1:font-semibold prose-h2:mt-8 prose-h2:scroll-m-20 prose-h2:text-xl prose-h2:mb-3 prose-h2:font-medium prose-h3:scroll-m-20 prose-h3:text-base prose-h3:font-medium prose-h4:scroll-m-20 prose-h5:scroll-m-20 prose-h6:scroll-m-20 prose-strong:font-medium prose-table:block prose-table:overflow-y-auto',
                        )}
                        markdown={true}
                    >
                        {stripWrappingCodeFence(children)}
                    </MessageContent>
                )}

                {isLastStreaming || contentNullOrEmpty ? null : (
                    <MessageActions
                        className={cn(
                            '-ml-2 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100',
                        )}
                    >
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
                        {isLast ? (
                            <MessageAction
                                tooltip="Regenerate"
                                side="bottom"
                                delayDuration={0}
                            >
                                <button
                                    className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
                                    aria-label="Regenerate"
                                    onClick={onReload}
                                    type="button"
                                >
                                    <RotateCcw className="size-4" />
                                </button>
                            </MessageAction>
                        ) : null}
                    </MessageActions>
                )}
            </div>
        </Message>
    );
}
