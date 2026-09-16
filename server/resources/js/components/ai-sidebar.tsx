import { usePage } from "@inertiajs/react";
import {
    Maximize2,
    MessageCircle,
    RotateCcw,
    Send,
    Sparkles,
    X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The AI assistant's own dedicated full-page route — the docked panel below
 * doesn't render there, since you're already on the assistant.
 */
const ASSISTANT_PAGE = "ai/chat";

export function AiSidebar({ className }: { className?: string }) {
    const { component } = usePage();
    const [open, setOpen] = useState(true);

    if (component === ASSISTANT_PAGE) {
        return null;
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="bg-primary text-primary-foreground fixed right-6 bottom-6 z-40 hidden size-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 lg:flex"
            >
                <MessageCircle className="size-5" />
                <span className="sr-only">Open assistant</span>
            </button>
        );
    }

    return (
        <aside
            className={cn(className, "hidden w-92 shrink-0 flex-col lg:flex")}
        >
            <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                    <span className="bg-primary/10 flex size-7 items-center justify-center rounded-full">
                        <Sparkles className="text-primary size-4" />
                    </span>
                    <span className="font-medium">Assistant</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled
                    >
                        <RotateCcw className="size-4" />
                        <span className="sr-only">History</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled
                    >
                        <Maximize2 className="size-4" />
                        <span className="sr-only">Expand</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setOpen(false)}
                    >
                        <X className="size-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-1 p-6 text-center">
                <p className="font-medium">Hi, I&apos;m your assistant</p>
                <p className="text-muted-foreground text-sm">
                    What can I help you with today?
                </p>
            </div>

            <div className="border-t p-3">
                <form
                    onSubmit={(event) => event.preventDefault()}
                    className="relative"
                >
                    <Input
                        placeholder="Ask me anything..."
                        disabled
                        className="pr-9"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        variant="ghost"
                        disabled
                        className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
                    >
                        <Send className="size-4" />
                    </Button>
                </form>
                <p className="text-muted-foreground mt-2 text-center text-xs">
                    Coming soon
                </p>
            </div>
        </aside>
    );
}
