import { Head, router } from '@inertiajs/react';
import { ListFilter, SquarePen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ChatInput } from '@/components/chat-input/chat-input';
import {
    CommandHistory,
    type ThreadSummary,
} from '@/components/chat/command-history';
import { Conversation } from '@/components/chat/conversation';
import { useAiChat, type ChatMessage } from '@/hooks/use-ai-chat';
import ai from '@/routes/ai';

function ActiveChat({
    threadId,
    messages,
    initialInput,
}: {
    threadId: string;
    messages: ChatMessage[];
    initialInput: string;
}) {
    const [input, setInput] = useState(initialInput);
    const {
        messages: chatMessages,
        send,
        status,
        stop,
        error,
        regenerate,
    } = useAiChat({
        threadId,
        respondUrl: ai.chat.threads.respond(threadId).url,
        initialMessages: messages,
    });

    console.log(error)

    const handleSend = () => {
        send(input);
        setInput('');
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {chatMessages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
                    <h1 className="text-xl font-semibold">
                        I&apos;m your assistant
                    </h1>
                    <p className="text-muted-foreground">
                        What can I help you with today?
                    </p>
                </div>
            ) : (
                <div className="min-h-0 flex-1">
                    <Conversation
                        messages={chatMessages}
                        status={status}
                        onReload={regenerate}
                        onSelectOption={send}
                    />
                </div>
            )}

            {error ? (
                <p
                    role="alert"
                    className="text-destructive mx-auto w-full max-w-3xl px-6 pb-2 text-sm"
                >
                    I couldn&apos;t reach the AI model just now — please try again
                    in a moment.
                </p>
            ) : null}

            <div className="mx-auto w-full max-w-3xl">
                <ChatInput
                    value={input}
                    onValueChange={setInput}
                    onSend={handleSend}
                    stop={stop}
                    status={status}
                />
            </div>
        </div>
    );
}

export default function AiChatPage({
    threads,
    activeThreadId,
    draft,
    messages,
}: {
    threads: ThreadSummary[];
    activeThreadId?: string;
    draft: string | null;
    messages: ChatMessage[];
}) {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    useEffect(() => {
        if (!activeThreadId) {
            router.post(ai.chat.threads.store().url, {
                draft: draft ?? '',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeThreadId]);

    return (
        <>
            <Head title="Assistant" />

            <div className="flex h-[calc(100svh-4rem)] flex-col">
                <div className="flex items-center justify-end gap-2 border-b p-2">
                    <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground hover:bg-muted bg-background rounded-full p-1.5 transition-colors"
                        aria-label="New chat"
                        onClick={() => router.post(ai.chat.threads.store().url)}
                    >
                        <SquarePen className="size-5" />
                    </button>
                    <CommandHistory
                        threads={threads}
                        activeThreadId={activeThreadId}
                        isOpen={isHistoryOpen}
                        setIsOpen={setIsHistoryOpen}
                        trigger={
                            <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground hover:bg-muted bg-background rounded-full p-1.5 transition-colors"
                                aria-label="Chat history"
                                onClick={() => setIsHistoryOpen(true)}
                            >
                                <ListFilter className="size-5" />
                            </button>
                        }
                    />
                </div>

                {activeThreadId ? (
                    <ActiveChat
                        key={activeThreadId}
                        threadId={activeThreadId}
                        messages={messages}
                        initialInput={draft ?? ''}
                    />
                ) : (
                    <div className="flex flex-1 items-center justify-center">
                        <p className="text-muted-foreground text-sm">
                            Starting a new chat…
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}

AiChatPage.layout = {
    breadcrumbs: [
        {
            title: 'Assistant',
            href: ai.chat(),
        },
    ],
};
