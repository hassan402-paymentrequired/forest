import { router } from '@inertiajs/react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useCallback, useMemo } from 'react';
import { parseAssistantText } from '@/lib/assistant-text';

export type ChatVisual =
    | {
          id: string;
          name: 'render_chart';
          input: {
              chart_type: 'bar' | 'line' | 'pie';
              title: string;
              labels: string[];
              values: number[];
          };
      }
    | {
          id: string;
          name: 'render_table';
          input: { title: string; columns: string[]; rows: string[][] };
      }
    | {
          id: string;
          name: 'render_list';
          input: { title: string; items: string[] };
      }
    | {
          id: string;
          name: 'navigate_to_page';
          input: { page: string; reason: string };
      }
    | {
          id: string;
          name: 'ask_clarifying_question';
          input: { question: string; options: string[] };
      };

export type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    visuals?: ChatVisual[];
};

type ToolPart = {
    type: string;
    toolCallId: string;
    state: string;
    input?: unknown;
};

const VISUAL_TOOLS = [
    'render_chart',
    'render_table',
    'render_list',
    'navigate_to_page',
    'ask_clarifying_question',
];

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

const asText = (value: unknown): string =>
    typeof value === 'string' ? value : '';

const asStrings = (value: unknown): string[] =>
    Array.isArray(value) ? value.map((item) => String(item ?? '')) : [];

/**
 * Turn a display-tool call into a typed visual. The arguments come from a
 * model, so every field is coerced defensively; a call too malformed to
 * draw returns null and is skipped rather than crashing the chat.
 */
function toVisual(id: string, name: string, input: unknown): ChatVisual | null {
    if (typeof input !== 'object' || input === null) {
        return null;
    }

    const args = input as Record<string, unknown>;
    const title = asText(args.title);

    switch (name) {
        case 'render_chart': {
            const labels = asStrings(args.labels);
            const values = (Array.isArray(args.values) ? args.values : []).map(
                Number,
            );

            if (labels.length === 0 || labels.length !== values.length) {
                return null;
            }

            const type = ['bar', 'line', 'pie'].includes(
                String(args.chart_type),
            )
                ? (args.chart_type as 'bar' | 'line' | 'pie')
                : 'bar';

            return {
                id,
                name,
                input: { chart_type: type, title, labels, values },
            };
        }
        case 'render_table': {
            const columns = asStrings(args.columns);
            const rows = (Array.isArray(args.rows) ? args.rows : []).map(
                asStrings,
            );

            return columns.length === 0
                ? null
                : { id, name, input: { title, columns, rows } };
        }
        case 'render_list': {
            const items = asStrings(args.items);

            return items.length === 0
                ? null
                : { id, name, input: { title, items } };
        }
        case 'navigate_to_page': {
            const page = asText(args.page);

            return page === ''
                ? null
                : { id, name, input: { page, reason: asText(args.reason) } };
        }
        case 'ask_clarifying_question': {
            const question = asText(args.question);

            return question === ''
                ? null
                : {
                      id,
                      name,
                      input: { question, options: asStrings(args.options) },
                  };
        }
        default:
            return null;
    }
}

function messageVisuals(message: UIMessage): ChatVisual[] {
    return (message.parts as unknown as ToolPart[])
        .filter(
            (part) =>
                part.type.startsWith('tool-') &&
                VISUAL_TOOLS.includes(part.type.slice('tool-'.length)) &&
                (part.state === 'input-available' ||
                    part.state === 'output-available'),
        )
        .map((part) =>
            toVisual(
                part.toolCallId,
                part.type.slice('tool-'.length),
                part.input,
            ),
        )
        .filter((visual): visual is ChatVisual => visual !== null);
}

/**
 * Thin wrapper around `@ai-sdk/react`'s `useChat`, adapted to this app's
 * plain `{id, role, content, visuals}` message shape (Inertia page props
 * are the source of truth for history — there's no client-side cache to
 * manage). The server streams the Vercel AI SDK protocol, so the display
 * tools' calls (charts, tables, lists, questions) arrive as tool parts.
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
                parts: [
                    ...(message.visuals ?? []).map((visual) => ({
                        type: `tool-${visual.name}`,
                        toolCallId: visual.id,
                        state: 'output-available',
                        input: visual.input,
                        output: '',
                    })),
                    { type: 'text' as const, text: message.content },
                ] as UIMessage['parts'],
            })),
        [initialMessages],
    );

    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: respondUrl,
                headers: xsrfHeader,
                // The server keeps the conversation itself; it only needs the
                // newest user message, not the whole transcript. A regenerate
                // re-sends a message the server already stored, so it is
                // flagged: without that the server appends it a second time
                // and every retry grows the stored transcript.
                prepareSendMessagesRequest: ({ messages, trigger }) => {
                    const lastUserMessage = messages
                        .filter((message) => message.role === 'user')
                        .at(-1);

                    return {
                        body: {
                            content: lastUserMessage
                                ? messageContent(lastUserMessage)
                                : '',
                            regenerate: trigger === 'regenerate-message',
                        },
                    };
                },
            }),
        [respondUrl],
    );

    const { messages, sendMessage, status, stop, regenerate, error } = useChat({
        id: threadId,
        messages: seedMessages,
        transport,
        // The reply is streamed outside Inertia, but the server renames a new
        // conversation from its first message as it finishes. Without this the
        // history panel keeps showing "New chat" until the next page visit.
        onFinish: ({ isAbort, isError }) => {
            if (!isAbort && !isError) {
                router.reload({ only: ['threads'] });
            }
        },
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

    const chatMessages: ChatMessage[] = messages.map((message) => {
        const isAssistant = message.role === 'assistant';

        if (!isAssistant) {
            return {
                id: message.id,
                role: 'user',
                content: messageContent(message),
                visuals: [],
            };
        }

        const { text, leakedCalls } = parseAssistantText(
            messageContent(message),
        );
        let visuals = messageVisuals(message);

        // The model sometimes writes a display call as text instead of
        // making it; draw it anyway, unless it also made the real call.
        if (visuals.length === 0) {
            visuals = leakedCalls
                .map((call, index) =>
                    toVisual(
                        `leaked-${message.id}-${index}`,
                        call.name,
                        call.input,
                    ),
                )
                .filter((visual): visual is ChatVisual => visual !== null);
        }

        // The model sometimes asks a question and then answers anyway; the
        // question is moot then, so keep only the answer.
        const answered = visuals.some(
            (visual) => visual.name !== 'ask_clarifying_question',
        );

        if (answered) {
            visuals = visuals.filter(
                (visual) => visual.name !== 'ask_clarifying_question',
            );
        }

        // A clarifying question is already on screen as a card; the model
        // tends to repeat it as text, so show only the card.
        const repeatsQuestion = visuals.some(
            (visual) => visual.name === 'ask_clarifying_question',
        );

        return {
            id: message.id,
            role: 'assistant',
            content: repeatsQuestion ? '' : text,
            visuals,
        };
    });

    return {
        messages: chatMessages,
        send,
        status,
        stop,
        error,
        regenerate: () => void regenerate(),
    };
}
