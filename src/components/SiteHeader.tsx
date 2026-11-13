import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import RedirectModal from './RedirectModal';

export interface HeaderNavItem {
    label: string;
    to: string;
    external?: boolean;
    icon?: 'vkintox' | 'github' | 'tiktok';
    symbol?: string;
    iconOnly?: boolean;
    confirmExternal?: boolean;
    state?: { scrollTo: string };
    action?: string;
    navKey?: string;
}

interface SiteHeaderProps {
    isDark: boolean;
    onThemeChange: (theme: 'light' | 'dark') => void;
    nav?: HeaderNavItem[];
    onAction?: (action: string) => void;
    activeNav?: string;
}

// shared header for secondary pages: same logo + theme toggle as the home page
export default function SiteHeader({ isDark, onThemeChange, nav, onAction, activeNav }: SiteHeaderProps)
{
    const location = useLocation();
    const navRef = useRef<HTMLElement | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const [pill, setPill] = useState<{ x: number; y: number; width: number; height: number; visible: boolean }>({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        visible: false,
    });
    const [githubOpen, setGithubOpen] = useState(false);

    const buttonStyle = (active: boolean) => ({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px 20px',
        borderRadius: 'var(--md-shape-full)',
        background: active ? 'var(--md-primary)' : 'transparent',
        color: active ? 'var(--md-on-primary)' : 'var(--md-on-surface)',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s var(--md-motion-effects), color 0.2s var(--md-motion-effects), transform 0.2s var(--md-motion-spatial-fast)',
        fontFamily: "'Google Sans Flex', sans-serif",
        fontWeight: 500,
        fontSize: '14px',
    } as const);

    const closeGithub = () => setGithubOpen(false);

    const iconFor = (item: HeaderNavItem) => {
        if (item.symbol)
        {
            return <span className="material-symbols-outlined header-nav-symbol" aria-hidden="true">{item.symbol}</span>;
        }

        if (item.icon === 'vkintox')
        {
            return <img src="/assets/vkintox.svg" alt="" width={22} height={22} className="header-nav-image" />;
        }

        if (item.icon === 'tiktok')
        {
            return (
                <svg viewBox="-1 -1 18 18" width={18} height={18} fill="currentColor" aria-hidden="true">
                    <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z" />
                </svg>
            );
        }

        if (item.icon === 'github')
        {
            return (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
            );
        }

        return null;
    };

    const itemActive = (item: HeaderNavItem) => {
        if (item.navKey) return Boolean(activeNav && item.navKey === activeNav);
        if (item.external || item.action) return false;
        if (item.to === '/') return location.pathname === '/';
        if (item.to === '/blog') return location.pathname === '/blog' || location.pathname.startsWith('/blog/');
        return location.pathname === item.to;
    };

    useLayoutEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useLayoutEffect(() => {
        const nav = navRef.current;
        if (!nav) return;

        const measure = () => {
            const active = nav.querySelector<HTMLElement>('.header-nav-link.is-active');
            if (!active)
            {
                setPill((previous) => ({ ...previous, visible: false }));
                return;
            }

            setPill({
                x: active.offsetLeft,
                y: active.offsetTop,
                width: active.offsetWidth,
                height: active.offsetHeight,
                visible: true,
            });
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(nav);
        window.addEventListener('resize', measure);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [nav, activeNav, location.pathname]);

    return (
        <>
            <header className={`page-header animate-fade-in${scrolled ? ' is-scrolled' : ''}`}>
                <Link
                    to="/"
                    className="header-logo-link"
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}
                >
                    <div
                        style={{
                            width: '48px',
                            height: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.3s var(--md-motion-spring-bouncy)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
                    >
                        <span className="header-logo-mark" role="img" aria-label="buwryy.net logo" />
                    </div>
                    <span className="m3-title-large" style={{ color: 'var(--md-on-surface)' }}>
                        buwryy<span style={{ color: 'var(--md-on-surface-variant)' }}>.net</span>
                    </span>
                </Link>

                {nav && nav.length > 0 && (
                    <nav className="header-nav" aria-label="Site" ref={navRef}>
                        <span
                            className={`header-nav-pill${pill.visible ? ' is-visible' : ''}`}
                            style={{
                                transform: `translate(${pill.x}px, ${pill.y}px)`,
                                width: pill.width,
                                height: pill.height,
                            }}
                            aria-hidden="true"
                        />
                        {nav.map((item) => {
                            const icon = iconFor(item);
                            const active = itemActive(item);
                            const className = `header-nav-link${item.iconOnly ? ' header-nav-icon' : ''}${active ? ' is-active' : ''}`;
                            const content = (
                                <>
                                    {icon}
                                    {!item.iconOnly && <span className="header-nav-label">{item.label}</span>}
                                </>
                            );

                            if (item.action)
                            {
                                return (
                                    <button
                                        key={item.label}
                                        type="button"
                                        className={className}
                                        onClick={() => onAction?.(item.action!)}
                                        aria-label={item.iconOnly ? item.label : undefined}
                                    >
                                        {content}
                                    </button>
                                );
                            }

                            if (item.confirmExternal)
                            {
                                return (
                                    <button
                                        key={item.label}
                                        type="button"
                                        className={className}
                                        onClick={() => setGithubOpen(true)}
                                        aria-label={item.label}
                                        style={item.icon === 'github' ? { color: isDark ? '#fff' : '#000' } : undefined}
                                    >
                                        {content}
                                    </button>
                                );
                            }

                            if (item.external)
                            {
                                return (
                                    <a
                                        key={item.label}
                                        className={className}
                                        href={item.to}
                                        target="_blank"
                                        rel="noopener"
                                        aria-label={item.iconOnly ? item.label : undefined}
                                    >
                                        {content}
                                    </a>
                                );
                            }

                            return (
                                <Link
                                    key={item.label}
                                    to={item.to}
                                    state={item.state}
                                    className={className}
                                    aria-label={item.iconOnly ? item.label : undefined}
                                    onClick={(event) => {
                                        if (item.state && item.to === location.pathname)
                                        {
                                            event.preventDefault();
                                            document.getElementById(item.state.scrollTo)?.scrollIntoView({
                                                behavior: 'smooth',
                                                block: 'start',
                                            });
                                            return;
                                        }

                                        if (item.to === location.pathname && !item.state)
                                        {
                                            event.preventDefault();
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                    }}
                                >
                                    {content}
                                </Link>
                            );
                        })}
                    </nav>
                )}

                <div
                    className="theme-toggle"
                    style={{
                        display: 'inline-flex',
                        borderRadius: 'var(--md-shape-full)',
                        background: 'var(--md-surface-container)',
                        padding: '4px',
                        gap: '0',
                        boxShadow: 'var(--md-elevation-1)',
                    }}
                >
                    <button onClick={() => onThemeChange('light')} style={buttonStyle(!isDark)} aria-label="Light mode">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>light_mode</span>
                    </button>
                    <button onClick={() => onThemeChange('dark')} style={buttonStyle(isDark)} aria-label="Dark mode">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dark_mode</span>
                    </button>
                </div>
            </header>

            <RedirectModal
                isOpen={githubOpen}
                onClose={closeGithub}
                destination="github"
                url="https://github.com/VKIntox/VKIntox"
            />
        </>
    );
}
