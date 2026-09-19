import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type MultiSelectOption = {
    value: string;
    label: string;
    /** Secondary text shown under the label in the list. */
    description?: string;
};

/**
 * A searchable multi-select. Selected options render as removable chips.
 * When `name` is set, one hidden `name[]` input is rendered per selected
 * value (or a single `name` input when `single`) so the field submits with a
 * regular or Inertia <Form>.
 *
 * For lists too large to load up front, pass `onSearchChange`: filtering is
 * then left to the caller (feed the matches back through `options`, and use
 * `loading` while fetching). It's called with '' each time the list opens. Pass `selectedOptions` so chips keep their labels even when a
 * selected option isn't in the current search results.
 */
export function MultiSelect({
    options,
    value,
    onChange,
    name,
    id,
    placeholder = 'Select options...',
    searchPlaceholder = 'Search...',
    emptyText = 'No results found.',
    noOptionsText = 'No options available.',
    selectedOptions: selectedOptionsProp,
    onSearchChange,
    loading,
    single,
    disabled,
    className,
}: {
    options: MultiSelectOption[];
    value: string[];
    onChange: (value: string[]) => void;
    name?: string;
    id?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    noOptionsText?: string;
    selectedOptions?: MultiSelectOption[];
    onSearchChange?: (query: string) => void;
    loading?: boolean;
    /** Allow only one selection; picking an option replaces the current one. */
    single?: boolean;
    disabled?: boolean;
    className?: string;
}) {
    const [open, setOpen] = useState(false);

    const selectedOptions =
        selectedOptionsProp ??
        options.filter((option) => value.includes(option.value));

    const handleOpenChange = (next: boolean) => {
        setOpen(next);

        if (next) {
            onSearchChange?.('');
        }
    };

    const toggle = (optionValue: string) => {
        if (single) {
            onChange(value.includes(optionValue) ? [] : [optionValue]);
            setOpen(false);

            return;
        }

        onChange(
            value.includes(optionValue)
                ? value.filter((selected) => selected !== optionValue)
                : [...value, optionValue],
        );
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange} modal>
            {name &&
                value.map((selected) => (
                    <input
                        key={selected}
                        type="hidden"
                        name={single ? name : `${name}[]`}
                        value={selected}
                    />
                ))}

            <PopoverAnchor asChild>
                <div
                    data-slot="multi-select"
                    className={cn(
                        'border-input dark:bg-input/30 flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border bg-transparent px-2 py-1 shadow-xs transition-[color,box-shadow]',
                        'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
                        disabled && 'pointer-events-none opacity-50',
                        className,
                    )}
                >
                    {selectedOptions.map((option) => (
                        <Badge
                            key={option.value}
                            variant="secondary"
                            className="gap-1 pr-1"
                        >
                            {option.label}
                            <button
                                type="button"
                                aria-label={`Remove ${option.label}`}
                                onClick={() => toggle(option.value)}
                                className="hover:bg-foreground/10 focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2"
                            >
                                <X />
                            </button>
                        </Badge>
                    ))}

                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            id={id}
                            role="combobox"
                            aria-expanded={open}
                            disabled={disabled}
                            className="text-muted-foreground flex min-h-6 min-w-24 flex-1 items-center justify-between gap-2 text-left text-sm outline-none"
                        >
                            <span className="truncate">
                                {selectedOptions.length === 0 && placeholder}
                            </span>
                            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                        </button>
                    </PopoverTrigger>
                </div>
            </PopoverAnchor>

            <PopoverContent
                align="start"
                className="w-(--radix-popover-trigger-width) p-0"
            >
                {options.length === 0 && !onSearchChange ? (
                    <p className="text-muted-foreground p-4 text-center text-sm">
                        {noOptionsText}
                    </p>
                ) : (
                    <Command shouldFilter={!onSearchChange}>
                        <CommandInput
                            placeholder={searchPlaceholder}
                            onValueChange={onSearchChange}
                        />
                        <CommandList>
                            {loading && (
                                <div className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-xs">
                                    <Loader2 className="size-3 animate-spin" />
                                    Searching...
                                </div>
                            )}
                            {!loading && (
                                <CommandEmpty>{emptyText}</CommandEmpty>
                            )}
                            <CommandGroup>
                                {options.map((option) => {
                                    const isSelected = value.includes(
                                        option.value,
                                    );

                                    return (
                                        <CommandItem
                                            key={option.value}
                                            value={
                                                onSearchChange
                                                    ? option.value
                                                    : option.label
                                            }
                                            onSelect={() =>
                                                toggle(option.value)
                                            }
                                        >
                                            <Check
                                                className={cn(
                                                    isSelected
                                                        ? 'opacity-100'
                                                        : 'opacity-0',
                                                )}
                                            />
                                            <span className="flex min-w-0 flex-col">
                                                <span>{option.label}</span>
                                                {option.description && (
                                                    <span className="text-muted-foreground text-xs">
                                                        {option.description}
                                                    </span>
                                                )}
                                            </span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                )}
            </PopoverContent>
        </Popover>
    );
}
