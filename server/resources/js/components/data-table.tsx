import { Link } from '@inertiajs/react';
import { Eye, MoreHorizontal, Pencil, Search, Trash2, X } from 'lucide-react';
import type { InertiaLinkProps } from '@inertiajs/react';
import type { ComponentProps, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const toneStyle: Record<Tone, { badge: string; dot: string }> = {
    success: {
        badge: 'border-emerald-600/20 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300',
        dot: 'bg-emerald-500 dark:bg-emerald-400',
    },
    danger: {
        badge: 'border-red-600/20 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300',
        dot: 'bg-red-500 dark:bg-red-400',
    },
    warning: {
        badge: 'border-amber-600/20 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
        dot: 'bg-amber-500 dark:bg-amber-400',
    },
    info: {
        badge: 'border-sky-600/20 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300',
        dot: 'bg-sky-500 dark:bg-sky-400',
    },
    neutral: {
        badge: 'border-border bg-muted text-muted-foreground',
        dot: 'bg-muted-foreground/60',
    },
};

export function StatusBadge({
    tone,
    children,
}: {
    tone: Tone;
    children: ReactNode;
}) {
    return (
        <Badge
            variant="outline"
            className={cn('gap-1.5 font-medium', toneStyle[tone].badge)}
        >
            <span
                aria-hidden
                className={cn('size-1.5 rounded-full', toneStyle[tone].dot)}
            />
            {children}
        </Badge>
    );
}

export function DataTableCard({
    title,
    icon: Icon,
    count,
    noun = 'record',
    description,
    action,
    filters,
    children,
}: {
    title: string;
    icon?: React.ComponentType<{ className?: string }>;
    count?: number;
    noun?: string;
    description?: string;
    action?: ReactNode;
    filters?: ReactNode;
    children: ReactNode;
}) {
    return (
        <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <div className="grid gap-1">
                    <CardTitle className="flex items-center gap-2">
                        {Icon && (
                            <Icon className="text-muted-foreground size-4" />
                        )}
                        {title}
                    </CardTitle>
                    {description && (
                        <p className="text-muted-foreground text-sm">
                            {description}
                        </p>
                    )}
                </div>
                {count !== undefined ? (
                    <span className="text-muted-foreground text-sm tabular-nums">
                        {count} {count === 1 ? noun : `${noun}s`}
                    </span>
                ) : (
                    action
                )}
            </CardHeader>
            {filters}
            <CardContent className="px-0 pb-0">{children}</CardContent>
        </Card>
    );
}

export function FilterBar({
    activeCount = 0,
    onClear,
    className,
    children,
}: {
    activeCount?: number;
    onClear?: () => void;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className="bg-muted/40 border-y px-6 py-4">
            <div
                className={cn(
                    'grid gap-3 sm:grid-cols-2 lg:grid-cols-4',
                    className,
                )}
            >
                {children}
            </div>

            {activeCount > 0 && onClear && (
                <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-muted-foreground text-xs">
                        {activeCount} {activeCount === 1 ? 'filter' : 'filters'}{' '}
                        applied
                    </p>
                    <Button variant="ghost" size="sm" onClick={onClear}>
                        <X className="size-3.5" />
                        Clear filters
                    </Button>
                </div>
            )}
        </div>
    );
}

export function FilterSearch({
    id,
    label = 'Search',
    value,
    onChange,
    placeholder,
    className,
}: {
    id: string;
    label?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    className?: string;
}) {
    return (
        <div className={cn('grid gap-1.5', className)}>
            <Label htmlFor={id} className="text-muted-foreground text-xs">
                {label}
            </Label>
            <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                    id={id}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    className="pl-8"
                />
            </div>
        </div>
    );
}

export function FilterSelect({
    id,
    label,
    value,
    onChange,
    allLabel,
    options,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    allLabel: string;
    options: { value: string; label: string }[];
}) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={id} className="text-muted-foreground text-xs">
                {label}
            </Label>
            <Select
                value={value || 'all'}
                onValueChange={(next) => onChange(next === 'all' ? '' : next)}
            >
                <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder={allLabel} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{allLabel}</SelectItem>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

export function DataTable({ children }: { children: ReactNode }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">{children}</table>
        </div>
    );
}

export function THead({ children }: { children: ReactNode }) {
    return (
        <thead className="text-muted-foreground border-b text-left text-xs">
            <tr>{children}</tr>
        </thead>
    );
}

export function TBody({ children }: { children: ReactNode }) {
    return <tbody className="divide-border divide-y">{children}</tbody>;
}

type CellProps = {
    align?: 'right';
    hideOnMobile?: boolean;
    className?: string;
    children?: ReactNode;
};

export function Th({ align, hideOnMobile, className, children }: CellProps) {
    return (
        <th
            className={cn(
                'px-6 py-2.5 font-medium',
                align === 'right' && 'text-right',
                hideOnMobile && 'hidden md:table-cell',
                className,
            )}
        >
            {children}
        </th>
    );
}

export function Td({
    align,
    hideOnMobile,
    muted,
    className,
    children,
}: CellProps & { muted?: boolean }) {
    return (
        <td
            className={cn(
                'px-6 py-3',
                muted && 'text-muted-foreground',
                align === 'right' && 'text-right',
                hideOnMobile && 'hidden md:table-cell',
                className,
            )}
        >
            {children}
        </td>
    );
}

export function Tr({ className, ...props }: ComponentProps<'tr'>) {
    return (
        <tr
            className={cn('hover:bg-muted/40 transition-colors', className)}
            {...props}
        />
    );
}

export function TableEmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
                <Icon className="size-5" />
            </div>
            <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            {action}
        </div>
    );
}

export function RowActions({
    viewHref,
    onEdit,
    onDelete,
    deleteLabel = 'Remove',
}: {
    viewHref?: InertiaLinkProps['href'];
    onEdit?: () => void;
    onDelete?: () => void;
    deleteLabel?: string;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Open menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {viewHref && (
                    <DropdownMenuItem asChild>
                        <Link href={viewHref}>
                            <Eye />
                            View
                        </Link>
                    </DropdownMenuItem>
                )}
                {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                        <Pencil />
                        Edit
                    </DropdownMenuItem>
                )}
                {onDelete && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={onDelete}
                        >
                            <Trash2 />
                            {deleteLabel}
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
