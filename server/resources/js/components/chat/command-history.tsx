import { router } from '@inertiajs/react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { CommandFooter } from '@/components/chat/command-footer';
import {
    formatRelativeDate,
    groupThreadsByDate,
} from '@/components/chat/history-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useKeyShortcut } from '@/hooks/use-key-shortcut';
import { cn } from '@/lib/utils';
import ai from '@/routes/ai';

export type ThreadSummary = {
    id: string;
    title: string | null;
    updated_at: string;
};

type CommandHistoryProps = {
    threads: ThreadSummary[];
    activeThreadId?: string;
    trigger: React.ReactNode;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
};

function CommandItemEdit({
    thread,
    editTitle,
    setEditTitle,
    onSave,
    onCancel,
}: {
    thread: ThreadSummary;
    editTitle: string;
    setEditTitle: (title: string) => void;
    onSave: (id: string) => void;
    onCancel: () => void;
}) {
    return (
        <form
            className="flex w-full items-center justify-between"
            onSubmit={(e) => {
                e.preventDefault();
                onSave(thread.id);
            }}
        >
            <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="border-input h-8 flex-1 rounded border bg-transparent px-3 py-1 text-sm"
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        onSave(thread.id);
                    }
                }}
            />
            <div className="ml-2 flex gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground size-8"
                            type="submit"
                            aria-label="Confirm"
                        >
                            <Check className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Confirm</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground size-8"
                            type="button"
                            onClick={onCancel}
                            aria-label="Cancel"
                        >
                            <X className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cancel</TooltipContent>
                </Tooltip>
            </div>
        </form>
    );
}

function CommandItemDelete({
    thread,
    onConfirm,
    onCancel,
}: {
    thread: ThreadSummary;
    onConfirm: (id: string) => void;
    onCancel: () => void;
}) {
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onConfirm(thread.id);
            }}
            className="flex w-full items-center justify-between"
        >
            <div className="flex flex-1 items-center">
                <span className="line-clamp-1 text-base font-normal">
                    {thread.title ?? 'New chat'}
                </span>
            </div>
            <div className="ml-2 flex gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive size-8"
                            type="submit"
                            aria-label="Confirm delete"
                        >
                            <Check className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Confirm</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground size-8"
                            onClick={onCancel}
                            type="button"
                            aria-label="Cancel"
                        >
                            <X className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cancel</TooltipContent>
                </Tooltip>
            </div>
        </form>
    );
}

function CommandItemRow({
    thread,
    isCurrentThread,
    onEdit,
    onDelete,
    editingId,
    deletingId,
}: {
    thread: ThreadSummary;
    isCurrentThread: boolean;
    onEdit: (thread: ThreadSummary) => void;
    onDelete: (id: string) => void;
    editingId: string | null;
    deletingId: string | null;
}) {
    return (
        <>
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="line-clamp-1 text-base font-normal">
                    {thread.title || 'New chat'}
                </span>
                {isCurrentThread && <Badge variant="outline">current</Badge>}
            </div>

            <div className="relative flex min-w-[140px] flex-shrink-0 items-center justify-end">
                <div className="text-muted-foreground mr-2 text-xs transition-opacity duration-200 group-hover:opacity-0">
                    {formatRelativeDate(thread.updated_at)}
                </div>

                <div className="absolute right-0 flex translate-x-1 gap-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="text-muted-foreground size-8"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(thread);
                                }}
                                disabled={!!editingId || !!deletingId}
                                aria-label="Rename"
                            >
                                <Pencil className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Rename</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="text-muted-foreground hover:text-destructive size-8"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(thread.id);
                                }}
                                disabled={!!editingId || !!deletingId}
                                aria-label="Delete"
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </>
    );
}

export function CommandHistory({
    threads,
    activeThreadId,
    trigger,
    isOpen,
    setIsOpen,
}: CommandHistoryProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);

        if (!open) {
            setSearchQuery('');
            setEditingId(null);
            setEditTitle('');
            setDeletingId(null);
        }
    };

    useKeyShortcut(
        (e) => e.key === 'k' && (e.metaKey || e.ctrlKey),
        () => handleOpenChange(!isOpen),
    );

    const handleEdit = useCallback((thread: ThreadSummary) => {
        setEditingId(thread.id);
        setEditTitle(thread.title ?? '');
    }, []);

    const handleSaveEdit = useCallback(
        (id: string) => {
            setEditingId(null);
            router.put(
                ai.chat.threads.update({ thread: id }).url,
                { title: editTitle },
                { preserveScroll: true },
            );
        },
        [editTitle],
    );

    const handleCancelEdit = useCallback(() => {
        setEditingId(null);
        setEditTitle('');
    }, []);

    const handleDelete = useCallback((id: string) => {
        setDeletingId(id);
    }, []);

    const handleConfirmDelete = useCallback((id: string) => {
        setDeletingId(null);
        router.delete(ai.chat.threads.destroy({ thread: id }).url);
    }, []);

    const handleCancelDelete = useCallback(() => {
        setDeletingId(null);
    }, []);

    const filteredThreads = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return query
            ? threads.filter((thread) =>
                  (thread.title ?? '').toLowerCase().includes(query),
              )
            : threads;
    }, [threads, searchQuery]);

    const groupedThreads = useMemo(
        () => groupThreadsByDate(threads, searchQuery),
        [threads, searchQuery],
    );

    const renderThreadItem = useCallback(
        (thread: ThreadSummary) => {
            const isCurrentThread = thread.id === activeThreadId;
            const isThisEditOrDelete =
                thread.id === editingId || thread.id === deletingId;
            const isEditOrDeleteMode = editingId || deletingId;

            return (
                <CommandItem
                    key={thread.id}
                    onSelect={() => {
                        if (isCurrentThread) {
                            setIsOpen(false);
                            return;
                        }
                        if (!editingId && !deletingId) {
                            setIsOpen(false);
                            router.get(
                                ai.chat({ query: { thread: thread.id } }).url,
                            );
                        }
                    }}
                    className={cn(
                        'group data-[selected=true]:bg-accent flex w-full items-center justify-between rounded-md py-2',
                        isThisEditOrDelete &&
                            'bg-accent data-[selected=true]:bg-accent',
                        !isThisEditOrDelete &&
                            isEditOrDeleteMode &&
                            'data-[selected=true]:bg-transparent',
                    )}
                    value={thread.id}
                >
                    {editingId === thread.id ? (
                        <CommandItemEdit
                            thread={thread}
                            editTitle={editTitle}
                            setEditTitle={setEditTitle}
                            onSave={handleSaveEdit}
                            onCancel={handleCancelEdit}
                        />
                    ) : deletingId === thread.id ? (
                        <CommandItemDelete
                            thread={thread}
                            onConfirm={handleConfirmDelete}
                            onCancel={handleCancelDelete}
                        />
                    ) : (
                        <CommandItemRow
                            thread={thread}
                            isCurrentThread={isCurrentThread}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            editingId={editingId}
                            deletingId={deletingId}
                        />
                    )}
                </CommandItem>
            );
        },
        [
            activeThreadId,
            setIsOpen,
            editingId,
            deletingId,
            editTitle,
            handleSaveEdit,
            handleCancelEdit,
            handleConfirmDelete,
            handleCancelDelete,
            handleEdit,
            handleDelete,
        ],
    );

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                <TooltipContent>History ⌘K</TooltipContent>
            </Tooltip>

            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogHeader className="sr-only">
                    <DialogTitle>Chat History</DialogTitle>
                    <DialogDescription>
                        Search through your past conversations
                    </DialogDescription>
                </DialogHeader>
                <DialogContent className="overflow-hidden border-none p-0 sm:max-w-3xl">
                    <Command className="[&_[cmdk-group-heading]]:text-muted-foreground border-none **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5 [&_[cmdk-item]_svg]:border-none">
                        <CommandInput
                            placeholder="Search history..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                        />

                        <CommandList className="max-h-[480px] min-h-[480px] flex-1 [&>[cmdk-list-sizer]]:space-y-6 [&>[cmdk-list-sizer]]:py-2">
                            {filteredThreads.length === 0 && (
                                <CommandEmpty>
                                    No chat history found.
                                </CommandEmpty>
                            )}

                            {searchQuery ? (
                                <CommandGroup className="p-1.5">
                                    {filteredThreads.map((thread) =>
                                        renderThreadItem(thread),
                                    )}
                                </CommandGroup>
                            ) : (
                                groupedThreads?.map((group) => (
                                    <CommandGroup
                                        key={group.name}
                                        heading={group.name}
                                        className="space-y-0 px-1.5"
                                    >
                                        {group.threads.map((thread) =>
                                            renderThreadItem(thread),
                                        )}
                                    </CommandGroup>
                                ))
                            )}
                        </CommandList>

                        <CommandFooter />
                    </Command>
                </DialogContent>
            </Dialog>
        </>
    );
}
