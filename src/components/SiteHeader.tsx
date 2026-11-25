import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import RedirectModal from './RedirectModal';
import ForgejoIcon from './ForgejoIcon';

export interface HeaderNavItem {
    label: string;
    to: string;
    external?: boolean;
    icon?: 'vkintox' | 'roseline' | 'forgejo' | 'tiktok';
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
    const [confirmLink, setConfirmLink] = useState<string | null>(null);
    const projectHost = /^(vkintox|roseline)\.buwryy\.net$/.test(window.location.hostname);

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

    const closeConfirm = () => setConfirmLink(null);

    const iconFor = (item: HeaderNavItem) => {
        if (item.symbol)
        {
            return <span className="material-symbols-outlined header-nav-symbol" aria-hidden="true">{item.symbol}</span>;
        }

        if (item.icon === 'vkintox')
        {
            return <img src="/assets/vkintox.svg" alt="" width={22} height={22} className="header-nav-image" />;
        }

        if (item.icon === 'roseline')
        {
            return <img src="/assets/roseline.svg" alt="" width={22} height={22} className="header-nav-image" />;
        }

        if (item.icon === 'tiktok')
        {
            return (
                <svg viewBox="-1 -1 18 18" width={18} height={18} fill="currentColor" aria-hidden="true">
                    <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z" />
                </svg>
            );
        }

        if (item.icon === 'forgejo')
        {
            return <ForgejoIcon size={18} />;
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
                {projectHost ? (
                    <a
                        href="https://buwryy.net/"
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
                    </a>
                ) : (
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
                )}

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
                                        onClick={() => setConfirmLink(item.to)}
                                        aria-label={item.label}
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

            {confirmLink && (
                <RedirectModal
                    isOpen
                    onClose={closeConfirm}
                    destination={new URL(confirmLink).hostname.replace(/^www\./, '')}
                    url={confirmLink}
                />
            )}
        </>
    );
}
