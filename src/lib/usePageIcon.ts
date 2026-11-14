import { useEffect } from 'react';

const DEFAULT_ICON = '/assets/logo.svg';

/** Swap the tab icon for a page, and put the previous icon back when it unmounts. */
export function usePageIcon(href: string)
{
    useEffect(() => {
        const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!link) return;

        const previous = link.getAttribute('href') ?? DEFAULT_ICON;
        link.setAttribute('href', href);

        return () => {
            link.setAttribute('href', previous);
        };
    }, [href]);
}
