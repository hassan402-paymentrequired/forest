import { ArrowUp, Square } from 'lucide-react';
import { useCallback, useRef } from 'react';
import {
    PromptInput,
    PromptInputAction,
    PromptInputActions,
    PromptInputTextarea,
} from '@/components/prompt-kit/prompt-input';
import { Button } from '@/components/ui/button';

type ChatInputProps = {
    value: string;
    onValueChange: (value: string) => void;
    onSend: () => void;
    isSubmitting?: boolean;
    stop: () => void;
    status?: 'submitted' | 'streaming' | 'ready' | 'error';
};

const isOnlyWhitespace = (text: string) => !/[^\s]/.test(text);

export function ChatInput({
    value,
    onValueChange,
    onSend,
    isSubmitting,
    stop,
    status,
}: ChatInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = useCallback(() => {
        if (isSubmitting) {
            return;
        }

        if (status === 'streaming') {
            stop();
            return;
        }

        onSend();
    }, [isSubmitting, onSend, status, stop]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (isSubmitting) {
                e.preventDefault();
                return;
            }

            if (e.key === 'Enter' && status === 'streaming') {
                e.preventDefault();
                return;
            }

            if (e.key === 'Enter' && !e.shiftKey) {
                if (isOnlyWhitespace(value)) {
                    return;
                }

                e.preventDefault();
                onSend();
            }
        },
        [isSubmitting, onSend, status, value],
    );

    return (
        <div
            className="relative order-2 px-2 pb-3 sm:pb-4 md:order-1"
            onClick={() => textareaRef.current?.focus()}
        >
            <PromptInput
                className="bg-popover relative z-10 p-0 pt-1 shadow-xs backdrop-blur-xl"
                maxHeight={200}
                value={value}
                onValueChange={onValueChange}
            >
                <PromptInputTextarea
                    ref={textareaRef}
                    placeholder="Ask a question..."
                    onKeyDown={handleKeyDown}
                    className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                />
                <PromptInputActions className="mt-3 w-full justify-end p-2">
                    <PromptInputAction
                        tooltip={status === 'streaming' ? 'Stop' : 'Send'}
                    >
                        <Button
                            size="sm"
                            className="size-9 rounded-full transition-all duration-300 ease-out"
                            disabled={
                                status === 'streaming'
                                    ? false
                                    : !value ||
                                      isSubmitting ||
                                      isOnlyWhitespace(value)
                            }
                            type="button"
                            onClick={handleSend}
                            aria-label={
                                status === 'streaming' ? 'Stop' : 'Send message'
                            }
                        >
                            {status === 'streaming' ? (
                                <Square className="size-4" />
                            ) : (
                                <ArrowUp className="size-4" />
                            )}
                        </Button>
                    </PromptInputAction>
                </PromptInputActions>
            </PromptInput>
        </div>
    );
}
