import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport, type UIMessage } from 'ai';
import { useCallback, useMemo } from 'react';

export type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
};

/**
 * Laravel's session auth requires the XSRF-TOKEN cookie echoed back as a
 * header on state-changing requests. Inertia's own router does this for us
 * automatically, but the chat transport below issues its own raw `fetch`
 * (needed for streaming), so it has to be added by hand.
 */
function xsrfHeader(): Record<string, string> {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    return match ? { 'X-XSRF-TOKEN': decodeURIComponent(match[1]) } : {};
}

function messageContent(message: UIMessage): string {
    return message.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('');
}

/**
 * Thin wrapper around `@ai-sdk/react`'s `useChat`, adapted to this app's
 * plain `{id, role, content}` message shape (Inertia page props are the
 * source of truth for history — there's no client-side cache to manage).
 */
export function useAiChat({
    threadId,
    respondUrl,
    initialMessages,
}: {
    threadId: string;
    respondUrl: string;
    initialMessages: ChatMessage[];
}) {
    const seedMessages: UIMessage[] = useMemo(
        () =>
            initialMessages.map((message) => ({
                id: message.id,
                role: message.role,
                parts: [{ type: 'text' as const, text: message.content }],
            })),
        [initialMessages],
    );

    const { messages, sendMessage, status, stop, regenerate } = useChat({
        id: threadId,
        messages: seedMessages,
        transport: new TextStreamChatTransport({
            api: respondUrl,
            headers: xsrfHeader,
        }),
    });

    const send = useCallback(
        (text: string) => {
            if (text.trim() === '') {
                return;
            }

            void sendMessage({ text });
        },
        [sendMessage],
    );

    const chatMessages: ChatMessage[] = messages.map((message) => ({
        id: message.id,
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: messageContent(message),
    }));

    return {
        messages: chatMessages,
        send,
        status,
        stop,
        regenerate: () => void regenerate(),
    };
}
