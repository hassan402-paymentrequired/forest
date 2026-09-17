import React, { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export type CodeBlockProps = {
    children?: React.ReactNode;
    className?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
    return (
        <div
            className={cn(
                'not-prose flex w-full flex-col overflow-clip border',
                'border-border bg-card text-card-foreground rounded-xl',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export type CodeBlockCodeProps = {
    code: string;
    language?: string;
    theme?: string;
    className?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlockCode({
    code,
    language = 'tsx',
    className,
    ...props
}: CodeBlockCodeProps) {
    const { resolvedAppearance } = useAppearance();
    const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function highlight() {
            const html = await codeToHtml(code, {
                lang: language,
                theme:
                    resolvedAppearance === 'dark'
                        ? 'github-dark'
                        : 'github-light',
            });

            if (!cancelled) {
                setHighlightedHtml(html);
            }
        }

        void highlight();

        return () => {
            cancelled = true;
        };
    }, [code, language, resolvedAppearance]);

    const classNames = cn(
        '[&>pre]:!bg-background w-full overflow-x-auto text-[13px] [&>pre]:px-4 [&>pre]:py-4',
        className,
    );

    return highlightedHtml ? (
        <div
            className={classNames}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            {...props}
        />
    ) : (
        <div className={classNames} {...props}>
            <pre>
                <code>{code}</code>
            </pre>
        </div>
    );
}

export type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>;

function CodeBlockGroup({
    children,
    className,
    ...props
}: CodeBlockGroupProps) {
    return (
        <div
            className={cn('flex items-center justify-between', className)}
            {...props}
        >
            {children}
        </div>
    );
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock };
