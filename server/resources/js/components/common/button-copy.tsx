import { useState } from 'react';

type ButtonCopyProps = {
    code: string;
};

export function ButtonCopy({ code }: ButtonCopyProps) {
    const [copied, setCopied] = useState(false);

    const onCopy = () => {
        void navigator.clipboard.writeText(code);
        setCopied(true);

        setTimeout(() => setCopied(false), 1000);
    };

    return (
        <button
            onClick={onCopy}
            type="button"
            className="text-muted-foreground hover:bg-muted inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs"
        >
            {copied ? 'Copied' : 'Copy'}
        </button>
    );
}
