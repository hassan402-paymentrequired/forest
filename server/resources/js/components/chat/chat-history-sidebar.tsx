import { Link, router } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ai from '@/routes/ai';

export type ThreadSummary = {
    id: string;
    title: string | null;
    updated_at: string;
};

export function ChatHistorySidebar({
    threads,
    activeThreadId,
}: {
    threads: ThreadSummary[];
    activeThreadId?: string;
}) {
    const handleDelete = (thread: ThreadSummary) => {
        if (confirm(`Delete "${thread.title ?? 'New chat'}"?`)) {
            router.delete(ai.chat.threads.destroy(thread).url);
        }
    };

    return (
        <aside className="flex w-72 shrink-0 flex-col border-r p-3">
            <Button
                variant="outline"
                className="mb-4 justify-start gap-2"
                onClick={() => router.post(ai.chat.threads.store().url)}
            >
                <Plus className="size-4" />
                New Chat
            </Button>

            <div className="text-muted-foreground mb-2 px-2 text-xs font-medium tracking-wide uppercase">
                Chat history
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto">
                {threads.length === 0 && (
                    <p className="text-muted-foreground px-2 text-sm">
                        No chats yet.
                    </p>
                )}

                {threads.map((thread) => (
                    <div
                        key={thread.id}
                        className="group flex items-center gap-1"
                    >
                        <Link
                            href={ai.chat({ query: { thread: thread.id } }).url}
                            className={cn(
                                'flex-1 truncate rounded-md px-2 py-1.5 text-sm',
                                thread.id === activeThreadId
                                    ? 'bg-accent font-medium'
                                    : 'hover:bg-accent/60',
                            )}
                        >
                            {thread.title ?? 'New chat'}
                        </Link>
                        <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive p-1 opacity-0 group-hover:opacity-100"
                            aria-label="Delete chat"
                            onClick={() => handleDelete(thread)}
                        >
                            <Trash2 className="size-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </aside>
    );
}
