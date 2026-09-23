import { createContext, useContext } from 'react';

/** A page the assistant may link to, as the server resolved it. */
export type PageLink = { title: string; url: string };

/** Keyed by the page name the model passes to `navigate_to_page`. */
export type PageLinks = Record<string, PageLink>;

/**
 * The server owns the page list: it resolves each name to a real URL, and it
 * only ever sends the pages of the portal the user is signed in to. Keeping
 * it in context means a link card deep in a message can resolve a page name
 * without every component in between having to carry the map.
 */
const PageLinksContext = createContext<PageLinks>({});

export function PageLinksProvider({
    links,
    children,
}: {
    links: PageLinks;
    children: React.ReactNode;
}) {
    return (
        <PageLinksContext.Provider value={links}>
            {children}
        </PageLinksContext.Provider>
    );
}

/**
 * The link for a page name, or null when the name is not one this portal has
 * — an older conversation may name a page that has since been renamed, and a
 * missing link is skipped rather than drawn as a dead one.
 */
export function usePageLink(page: string): PageLink | null {
    return useContext(PageLinksContext)[page] ?? null;
}
