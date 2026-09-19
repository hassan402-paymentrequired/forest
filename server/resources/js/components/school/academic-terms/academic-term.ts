export type TermName = 'first_term' | 'second_term' | 'third_term';

export type Term = {
    id: string;
    name: TermName;
    start_date: string;
    end_date: string;
    is_current: boolean;
};

export type Session = {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    terms: Term[];
};

export type Stats = {
    total: number;
    current_term: string | null;
};

export const termLabel: Record<TermName, string> = {
    first_term: 'First Term',
    second_term: 'Second Term',
    third_term: 'Third Term',
};
