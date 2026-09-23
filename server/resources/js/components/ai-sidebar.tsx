import { router, usePage } from '@inertiajs/react';
import { ArrowUpIcon, MessageCircle, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ai from '@/routes/ai';
import ministry from '@/routes/ministry';

/**
 * Where each portal's assistant lives, and the page component that IS the
 * assistant — the docked panel hides there, since you are already in it.
 */
const ASSISTANTS = {
    school: {
        component: 'ai/chat',
        open: (draft: string) => ai.chat({ query: { draft } }).url,
        placeholder: 'Ask about your students, classes or attendance…',
    },
    ministry: {
        component: 'ministry/assistant',
        open: (draft: string) => ministry.assistant({ query: { draft } }).url,
        placeholder: 'Ask about any school, or where to find something…',
    },
} as const;

/**
 * A composer docked beside the page, in both portals. It deliberately holds
 * no conversation of its own: sending opens the portal's assistant with the
 * text carried across as a draft, which is what the `draft` parameter on both
 * assistant routes is for. One chat, reachable from anywhere, rather than a
 * second transcript that the history panel would never show.
 */
export function AiSidebar({ className }: { className?: string }) {
    const { component, props } = usePage<{
        portal: 'ministry' | 'school' | null;
    }>();
    const [isOpen, setIsOpen] = useState(true);
    const [draft, setDraft] = useState('');

    const assistant = props.portal ? ASSISTANTS[props.portal] : null;

    if (!assistant || component === assistant.component) {
        return null;
    }

    const openAssistant = () => {
        router.get(assistant.open(draft.trim()));
    };

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="bg-primary text-primary-foreground fixed right-6 bottom-6 z-40 hidden size-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 lg:flex"
            >
                <MessageCircle className="size-5" />
                <span className="sr-only">Open assistant</span>
            </button>
        );
    }

    return (
        <aside
            className={cn(
                className,
                'bg-background hidden w-92 shrink-0 flex-col overflow-hidden rounded-xl shadow-sm lg:flex',
                // Fixed to the viewport like the left sidebar, so it stays put
                // while the page scrolls; only its own middle region scrolls.
                'sticky top-2 mt-2 mr-2 h-[calc(100svh-(--spacing(4)))] self-start',
            )}
        >
            <div className="flex shrink-0 items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                    <span className="bg-primary/10 flex size-7 items-center justify-center rounded-full">
                        <Sparkles className="text-primary size-4" />
                    </span>
                    <span className="font-medium">Assistant</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-full"
                    onClick={() => setIsOpen(false)}
                >
                    <X className="size-4" />
                    <span className="sr-only">Close assistant</span>
                </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                <span className="bg-muted flex size-10 items-center justify-center rounded-full">
                    <Sparkles className="text-muted-foreground size-5" />
                </span>
                <p className="font-medium">Ask a question</p>
                <p className="text-muted-foreground text-sm">
                    Your question opens in the assistant, where the full
                    conversation and its history live.
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.get(assistant.open(''))}
                >
                    Open the assistant
                </Button>
            </div>

            <div className="shrink-0 border-t p-3">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        openAssistant();
                    }}
                    className="flex items-end gap-2"
                >
                    <label className="sr-only" htmlFor="assistant-draft">
                        Your question
                    </label>
                    <textarea
                        id="assistant-draft"
                        rows={2}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                openAssistant();
                            }
                        }}
                        placeholder={assistant.placeholder}
                        className="border-input bg-background focus-visible:ring-ring min-h-16 flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={draft.trim() === ''}
                    >
                        <ArrowUpIcon className="size-4" />
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </div>
        </aside>
    );
}
