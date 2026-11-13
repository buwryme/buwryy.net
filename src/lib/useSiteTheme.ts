import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

// the theme the home page already uses, pulled into a hook so newer pages
// don't grow their own copy. ?theme=dark / ?theme=light is a deep link for
// previews; it does not overwrite the visitor's saved choice.
export function useSiteTheme()
{
    const [isDark, setIsDark] = useState<boolean>(() => {
        const query = new URLSearchParams(window.location.search).get('theme');
        if (query === 'dark') return true;
        if (query === 'light') return false;

        const saved = localStorage.getItem('buwryy-theme');
        if (saved) return saved === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        if (!new URLSearchParams(window.location.search).get('theme'))
            localStorage.setItem('buwryy-theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            if (!localStorage.getItem('buwryy-theme'))
                setIsDark(e.matches);
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const setTheme = (theme: Theme) => setIsDark(theme === 'dark');

    return { isDark, setTheme };
}
