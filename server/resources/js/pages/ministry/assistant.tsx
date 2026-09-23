import {
    AssistantChat,
    type AssistantConfig,
} from '@/components/chat/assistant-chat';
import type {
    ChatRoutes,
    ThreadSummary,
} from '@/components/chat/command-history';
import type { PageLinks } from '@/components/chat/page-links';
import type { ChatMessage } from '@/hooks/use-ai-chat';
import ministry from '@/routes/ministry';

/** Conversations are kept for the record, so the ministry has no delete. */
const historyRoutes: ChatRoutes = {
    open: (thread) => ministry.assistant({ query: { thread } }).url,
    rename: (thread) => ministry.assistant.threads.update({ thread }).url,
};

const config: AssistantConfig = {
    title: 'Assistant',
    heading: 'Ask about any school',
    subheading:
        'I answer from live records across every school on the platform.',
    suggestions: [
        'Which schools are understaffed?',
        'Which schools have the lowest attendance this term?',
        'Attendance rate by LGA',
        'Which teachers are on leave, by school?',
    ],
    storeUrl: ministry.assistant.threads.store().url,
    respondUrl: (threadId) => ministry.assistant.threads.respond(threadId).url,
    historyRoutes,
};

export default function MinistryAssistant({
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

MinistryAssistant.layout = {
    breadcrumbs: [{ title: 'Assistant', href: ministry.assistant() }],
};
