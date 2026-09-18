import {
    ChatContainerContent,
    ChatContainerRoot,
} from '@/components/prompt-kit/chat-container';
import { Loader } from '@/components/prompt-kit/loader';
import { ScrollButton } from '@/components/prompt-kit/scroll-button';
import type { ChatMessage } from '@/hooks/use-ai-chat';
import { Message } from '@/components/chat/message';

type ConversationProps = {
    messages: ChatMessage[];
    status?: 'streaming' | 'ready' | 'submitted' | 'error';
    onReload: () => void;
    onSelectOption?: (option: string) => void;
};

export function Conversation({
    messages,
    status = 'ready',
    onReload,
    onSelectOption,
}: ConversationProps) {
    if (!messages || messages.length === 0) {
        return <div className="h-full w-full" />;
    }

    return (
        <div className="relative flex h-full w-full flex-col items-center overflow-x-hidden overflow-y-auto">
            <ChatContainerRoot className="relative w-full">
                <ChatContainerContent
                    className="flex w-full flex-col items-center pt-6 pb-4"
                    style={{
                        scrollbarGutter: 'stable both-edges',
                        scrollbarWidth: 'none',
                    }}
                >
                    {messages.map((message, index) => {
                        const isLast = index === messages.length - 1;

                        return (
                            <Message
                                key={message.id}
                                id={message.id}
                                variant={message.role}
                                isLast={isLast}
                                onReload={onReload}
                                visuals={message.visuals}
                                onSelectOption={onSelectOption}
                                status={status}
                            >
                                {message.content}
                            </Message>
                        );
                    })}
                    {status === 'submitted' &&
                        messages.length > 0 &&
                        messages[messages.length - 1].role === 'user' && (
                            <div className="group min-h-scroll-anchor flex w-full max-w-3xl flex-col items-start gap-2 px-6 pb-2">
                                <Loader />
                            </div>
                        )}
                    <div className="absolute bottom-0 flex w-full max-w-3xl flex-1 items-end justify-end gap-4 px-6 pb-2">
                        <ScrollButton className="absolute top-[-50px] right-[30px]" />
                    </div>
                </ChatContainerContent>
            </ChatContainerRoot>
        </div>
    );
}
