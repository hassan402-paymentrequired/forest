import type { Tone } from '@/components/data-table';

/** A rate as a percentage, or a dash when nothing has been recorded. */
export const percent = (value: number | null | undefined) =>
    value === null || value === undefined ? '—' : `${value}%`;

/** A count with thousands separators, or a dash when there is none. */
export const count = (value: number | null | undefined) =>
    value === null || value === undefined ? '—' : value.toLocaleString();

/** Colour a rate against a floor: below it is a problem. */
export const rateTone = (value: number | null, threshold: number): Tone => {
    if (value === null) {
        return 'neutral';
    }

    return value < threshold ? 'danger' : 'success';
};

export const formatDate = (value: string | null) =>
    value
        ? new Date(value).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          })
        : '—';
