import { router, usePage } from "@inertiajs/react";
import {
    ArrowUpIcon,
    GlobeIcon,
    Maximize2,
    MessageCircle,
    MessageCircleDashedIcon,
    PaperclipIcon,
    PlusIcon,
    RotateCcw,
    Send,
    Sparkles,
    TelescopeIcon,
    X,
} from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ai from "@/routes/ai";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
} from "./ui/input-group";

/**
 * The AI assistant's own dedicated full-page route — the docked panel below
 * doesn't render there, since you're already on the assistant.
 */
const ASSISTANT_PAGE = "ai/chat";

export function AiSidebar({ className }: { className?: string }) {
    const { component, props } = usePage<{
        auth: { school: { id: string } | null };
    }>();
    const [open, setOpen] = useState(true);
    const [draft, setDraft] = useState("");
    const isSchoolUser = Boolean(props.auth.school);

    if (component === ASSISTANT_PAGE) {
        return null;
    }

    const openAssistant = () => {
        router.get(ai.chat({ query: { draft } }).url);
    };

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
            className={cn(
                className,
                "bg-background hidden w-92 shrink-0 flex-col overflow-hidden rounded-xl shadow-sm lg:flex",
                // Fixed to the viewport like the left sidebar, so it stays put
                // while the page scrolls; only its own middle region scrolls.
                "sticky top-2 mt-2 mr-2 h-[calc(100svh-(--spacing(4)))] self-start",
            )}
        >
            <div className="flex shrink-0 items-center justify-between border-b p-4">
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
                        className="size-7 rounded-full bg-red-500/15 hover:bg-red-500/10 flex items-center justify-center"
                        onClick={() => setOpen(false)}
                    >
                        <X className="size-4 text-red-600" />
                    </Button>
                </div>
            </div>

             <Empty className="min-h-0 flex-1 overflow-y-auto">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageCircleDashedIcon />
                  </EmptyMedia>
                  <EmptyTitle>Morning, shadcn!</EmptyTitle>
                  <EmptyDescription>
                    What are we working on today? Press send to start a new
                    conversation
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>

            <div className="shrink-0 border-t p-3">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (isSchoolUser) {
                            openAssistant();
                        }
                    }}
                    className="w-full"
                >
                    <InputGroup>
                        <div className="h-14 w-full px-3 py-2.5">
                            <span
                                className="line-clamp-2 opacity-60 data-[status=ready]:opacity-100"
                                data-status={status}
                            >
                                {/* {nextMessage ? (
                                    getMessageText(nextMessage)
                                ) : ( */}
                                <span className="text-muted-foreground">
                                    No messages queued. Reset the conversation.
                                </span>
                                {/* )} */}
                            </span>
                        </div>
                        <InputGroupAddon align="block-end" className="pt-1">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <InputGroupButton
                                        aria-label="Add files"
                                        type="button"
                                        size="icon-sm"
                                        variant="outline"
                                    >
                                        <PlusIcon />
                                    </InputGroupButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="start"
                                    side="top"
                                    className="w-44"
                                >
                                    <DropdownMenuItem>
                                        <PaperclipIcon />
                                        Add Photos & Files
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                        <TelescopeIcon />
                                        Deep Research
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <GlobeIcon />
                                        Web Search
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <InputGroupButton
                                type="submit"
                                variant="default"
                                size="icon-sm"
                                disabled={!isSchoolUser}
                                className="ml-auto"
                            >
                                <ArrowUpIcon />
                                <span className="sr-only">Send</span>
                            </InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>
                </form>
            </div>
        </aside>
    );
}
