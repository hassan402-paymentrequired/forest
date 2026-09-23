import {
    AssistantChat,
    type AssistantConfig,
} from '@/components/chat/assistant-chat';
import {
    schoolChatRoutes,
    type ThreadSummary,
} from '@/components/chat/command-history';
import type { PageLinks } from '@/components/chat/page-links';
import type { ChatMessage } from '@/hooks/use-ai-chat';
import ai from '@/routes/ai';

const config: AssistantConfig = {
    title: 'Assistant',
    heading: "I'm your assistant",
    subheading: 'What can I help you with today?',
    storeUrl: ai.chat.threads.store().url,
    respondUrl: (threadId) => ai.chat.threads.respond(threadId).url,
    historyRoutes: schoolChatRoutes,
};

export default function AiChatPage({
    threads,
    activeThreadId,
    draft,
    messages,
    pages,
}: {
    threads: ThreadSummary[];
    activeThreadId?: string;
    draft: string | null;
    messages: ChatMessage[];
    pages: PageLinks;
}) {
    return (
        <AssistantChat
            threads={threads}
            activeThreadId={activeThreadId}
            draft={draft}
            messages={messages}
            pages={pages}
            config={config}
        />
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
