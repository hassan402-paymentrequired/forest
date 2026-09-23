import { Head, router, setLayoutProps } from '@inertiajs/react';
import { ListFilter, SquarePen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ChatInput } from '@/components/chat-input/chat-input';
import {
    CommandHistory,
    type ChatRoutes,
    type ThreadSummary,
} from '@/components/chat/command-history';
import { Conversation } from '@/components/chat/conversation';
import {
    PageLinksProvider,
    type PageLinks,
} from '@/components/chat/page-links';
import { useAiChat, type ChatMessage } from '@/hooks/use-ai-chat';

/** Everything that differs between the school and ministry assistants. */
export type AssistantConfig = {
    title: string;
    heading: string;
    subheading: string;
    /** Starter questions shown in an empty conversation. */
    suggestions?: string[];
    /** POST target that starts a new conversation. */
    storeUrl: string;
    /** POST target the chat streams a reply from. */
    respondUrl: (threadId: string) => string;
    historyRoutes: ChatRoutes;
};

function ActiveChat({
    threadId,
    messages,
    initialInput,
    config,
}: {
    threadId: string;
    messages: ChatMessage[];
    initialInput: string;
    config: AssistantConfig;
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
        respondUrl: config.respondUrl(threadId),
        initialMessages: messages,
    });

    const handleSend = () => {
        send(input);
        setInput('');
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {chatMessages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
                    <h1 className="text-xl font-semibold">{config.heading}</h1>
                    <p className="text-muted-foreground">{config.subheading}</p>
                    {config.suggestions && config.suggestions.length > 0 && (
                        <div className="mt-4 flex max-w-2xl flex-wrap justify-center gap-2 px-6">
                            {config.suggestions.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    className="bg-background hover:bg-muted rounded-full border px-3 py-1.5 text-sm transition-colors"
                                    onClick={() => send(suggestion)}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
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
                    I couldn&apos;t reach the AI model just now — please try
                    again in a moment.
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

/**
 * A full-page chat with conversation history, used by both portals. The
 * server owns the conversations; this page starts one when none is open.
 */
export function AssistantChat({
    threads,
    activeThreadId,
    draft,
    messages,
    pages,
    config,
}: {
    threads: ThreadSummary[];
    activeThreadId?: string;
    draft: string | null;
    messages: ChatMessage[];
    pages: PageLinks;
    config: AssistantConfig;
}) {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    useEffect(() => {
        if (!activeThreadId) {
            router.post(config.storeUrl, { draft: draft ?? '' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeThreadId]);

    setLayoutProps({
        headerActions: (
            <>
                <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted bg-background rounded-full p-1.5 transition-colors"
                    aria-label="New chat"
                    onClick={() => router.post(config.storeUrl)}
                >
                    <SquarePen className="size-5" />
                </button>
                <CommandHistory
                    threads={threads}
                    activeThreadId={activeThreadId}
                    isOpen={isHistoryOpen}
                    setIsOpen={setIsHistoryOpen}
                    routes={config.historyRoutes}
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
            </>
        ),
    });

    return (
        <PageLinksProvider links={pages}>
            <Head title={config.title} />

            <div className="flex h-[calc(100svh-4rem)] flex-col">
                {activeThreadId ? (
                    <ActiveChat
                        key={activeThreadId}
                        threadId={activeThreadId}
                        messages={messages}
                        initialInput={draft ?? ''}
                        config={config}
                    />
                ) : (
                    <div className="flex flex-1 items-center justify-center">
                        <p className="text-muted-foreground text-sm">
                            Starting a new chat…
                        </p>
                    </div>
                )}
            </div>
        </PageLinksProvider>
    );
}
