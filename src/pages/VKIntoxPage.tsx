import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import PageBackdrop from '../components/PageBackdrop';
import Cookie from '../components/Cookie';
import EffectsPlayground from '../components/EffectsPlayground';
import Footer from '../components/Footer';
import PrivacyModal from '../components/PrivacyModal';
import AcknowledgementsModal from '../components/AcknowledgementsModal';
import RedirectModal from '../components/RedirectModal';
import RainbowWord from '../components/RainbowWord';
import { useSiteTheme } from '../lib/useSiteTheme';
import { VKINTOX_NAV } from '../lib/vkNav';
import './VKIntoxPage.css';

const INSTALL = 'curl -fsSL https://buwryy.net/api/vkintox/setup-script | bash';
const UNINSTALL = 'curl -fsSL https://buwryy.net/api/vkintox/setup-script | bash -s -- uninstall';

export default function VKIntoxPage()
{
    const { isDark, setTheme } = useSiteTheme();
    const location = useLocation();
    const [copied, setCopied] = useState(false);
    const [copiedUninstall, setCopiedUninstall] = useState(false);
    const [activeNav, setActiveNav] = useState('overview');
    const [redirect, setRedirect] = useState<{ destination: 'github' | 'discord'; url: string } | null>(null);
    const [privacyOpen, setPrivacyOpen] = useState(false);
    const [privacyClosing, setPrivacyClosing] = useState(false);
    const [acknowledgementsOpen, setAcknowledgementsOpen] = useState(false);
    const [acknowledgementsClosing, setAcknowledgementsClosing] = useState(false);

    useEffect(() => {
        const update = () => {
            const marker = window.scrollY + 180;
            const why = document.getElementById('why');
            const effects = document.getElementById('effects');

            if (effects && marker >= effects.offsetTop) setActiveNav('effects');
            else if (why && marker >= why.offsetTop) setActiveNav('why');
            else setActiveNav('overview');
        };

        update();
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, []);

    useEffect(() => {
        const previous = document.title;
        document.title = 'VKIntox — unbannable shaders for Linux';
        return () => { document.title = previous; };
    }, []);

    useEffect(() => {
        const requested = (location.state as { scrollTo?: string } | null)?.scrollTo;
        const id = requested ?? (location.hash ? location.hash.slice(1) : '');

        if (!id)
        {
            window.scrollTo({ top: 0, behavior: 'auto' });
            return;
        }

        const timer = window.setTimeout(() => {
            const section = document.getElementById(id);
            if (!section) return;
            const top = section.getBoundingClientRect().top
                + (document.documentElement.scrollTop || document.body.scrollTop);
            document.documentElement.scrollTo({ top, behavior: 'auto' });
            document.body.scrollTo({ top, behavior: 'auto' });
        }, 600);

        return () => window.clearTimeout(timer);
    }, [location.hash, location.key, location.state]);

    const copyUninstall = async () => {
        try
        {
            await navigator.clipboard.writeText(UNINSTALL);
            setCopiedUninstall(true);
            window.setTimeout(() => setCopiedUninstall(false), 1800);
        }
        catch { /* clipboard blocked */ }
    };

    const copyInstall = async () => {
        try { await navigator.clipboard.writeText(INSTALL); } catch { /* clipboard can be blocked */ }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
    };

    return (
        <>
            <div className="vk-page">
                <PageBackdrop cookieSize={520} />
                <div className="page-shell">
                    <SiteHeader isDark={isDark} onThemeChange={setTheme} nav={VKINTOX_NAV} activeNav={activeNav} />

                    <main className="vk-main">
                        <section className="vk-hero animate-slide-up">
                            <img className="vk-icon" src="/assets/vkintox.svg" alt="VKIntox icon" width={120} height={120} />
                            <h1 className="m3-display-large m3-emphasized vk-title">
                                Unbannable <span className="vk-underline">Linux</span>
                                <br />
                                shaders for <RainbowWord text="Roblox" className="vk-accent" />
                                <br />
                                and many other games
                            </h1>
                            <p className="m3-body-large vk-sub">
                                Because it's actually <span className="vk-nowrap">driver-level</span>, for every modern GPU!
                            </p>
                            <div className="vk-linux-only">
                                <img src="/assets/linux.png" alt="" width={20} height={24} />
                                <span>only</span>
                            </div>

                            <div className="vk-install">
                                <div className="vk-install-card">
                                    <div className="vk-install-main">
                                        <div className="vk-install-copy">
                                            <p className="vk-install-label">install</p>
                                            <code className="vk-install-cmd">{INSTALL}</code>
                                        </div>
                                        <button
                                            type="button"
                                            className="vk-copy"
                                            onClick={copyInstall}
                                            aria-label={copied ? 'Copied' : 'Copy install command'}
                                        >
                                            {copied ? (
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>
                                            )}
                                        </button>
                                    </div>
                                    <div className="vk-install-uninstall">
                                        <span className="vk-install-uninstall-label">uninstall</span>
                                        <code>{UNINSTALL}</code>
                                        <button
                                            type="button"
                                            className="vk-copy-outlined"
                                            onClick={copyUninstall}
                                            aria-label={copiedUninstall ? 'Copied' : 'Copy uninstall command'}
                                        >
                                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                                {copiedUninstall ? (
                                                    <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                                                ) : (
                                                    <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z" />
                                                )}
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="vk-why-wrap" id="why">
                            <div className="vk-why animate-fade-in">
                                <div className="vk-why-head">
                                    <h2 className="m3-headline-large vk-why-title">No one does it like VKIntox:</h2>
                                    <p className="vk-muted vk-why-aside m3-body-medium">...at least for Linux</p>
                                </div>

                                <ul className="vk-list">
                                    <li>
                                        <span className="vk-why-num">01</span>
                                        <Cookie size={20} lobes={7} className="vk-bullet" />
                                        <span><strong>Unbannable</strong>: the shaders are only ever inside the driver, <strong>never</strong> inside the game.</span>
                                    </li>
                                    <li>
                                        <span className="vk-why-num">02</span>
                                        <Cookie size={20} lobes={7} className="vk-bullet" />
                                        <span><strong>Proper depth effects</strong>: depth effects work, yes, seriously.</span>
                                    </li>
                                    <li>
                                        <span className="vk-why-num">03</span>
                                        <Cookie size={20} lobes={7} className="vk-bullet" />
                                        <span><strong>Your ReShade presets can be brought in</strong>: <code>.ini</code> presets from ReShade work identically.</span>
                                    </li>
                                    <li>
                                        <span className="vk-why-num">04</span>
                                        <Cookie size={20} lobes={7} className="vk-bullet" />
                                        <span><strong>A built-in in-game Material 3 overlay</strong>: a seriously good looking eyecandy overlay for adjusting shaders, and generally configuring VKIntox.</span>
                                    </li>
                                    <li>
                                        <span className="vk-why-num">05</span>
                                        <Cookie size={20} lobes={7} className="vk-bullet" />
                                        <span><strong>Prebuilts</strong>: prebuilt releases for almost every popular distro, including Flatpak and ARM computers.</span>
                                    </li>
                                    <li>
                                        <span className="vk-why-num">06</span>
                                        <Cookie size={20} lobes={7} className="vk-bullet" />
                                        <span><strong>Open Source</strong>: VKIntox is fully open source and licensed under GPL-3.0-or-later. VKIntox is all for open projects, and for PC users to finally feel at peace whilst using their computer.</span>
                                        <span className="vk-muted vk-why-note-inline m3-body-medium">...which is why it is Linux-only!</span>
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section className="vk-section" id="effects">
                            <div className="vk-section-head">
                                <h2 className="m3-headline-large">It is that good. Try it out, right here, in this website.</h2>
                            </div>
                            <EffectsPlayground />
                        </section>

                        <section className="vk-section vk-cta-section">
                            <div className="vk-cta">
                                <div>
                                    <h3 className="m3-headline-medium">We can't wait!</h3>
                                    <p className="m3-body-large">It takes only one command and a few quick prompts.</p>
                                </div>
                                <div className="vk-cta-actions">
                                    <button
                                        type="button"
                                        className="m3-btn-filled"
                                        onClick={() => setRedirect({ destination: 'github', url: 'https://github.com/VKIntox/VKIntox' })}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                                        </svg>
                                        Star on GitHub
                                    </button>
                                    <button
                                        type="button"
                                        className="m3-btn-tonal"
                                        onClick={() => setRedirect({ destination: 'discord', url: 'https://discord.gg/HrUrzXAxPV' })}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                                        </svg>
                                        Join the Discord
                                    </button>
                                </div>
                            </div>
                        </section>

                        <p className="vk-beta-note">VKIntox is still in its beta stage. You can file bug reports. This doesn't mean it isn't usable.</p>
                    </main>

                    <Footer
                        onPrivacyClick={() => setPrivacyOpen(true)}
                        onAcknowledgementsClick={() => setAcknowledgementsOpen(true)}
                    />
                </div>
            </div>

            <AcknowledgementsModal
                isOpen={acknowledgementsOpen}
                isClosing={acknowledgementsClosing}
                onClose={() => {
                    setAcknowledgementsClosing(true);
                    setTimeout(() => {
                        setAcknowledgementsOpen(false);
                        setAcknowledgementsClosing(false);
                    }, 200);
                }}
            />
            <PrivacyModal
                isOpen={privacyOpen}
                isClosing={privacyClosing}
                onClose={() => {
                    setPrivacyClosing(true);
                    setTimeout(() => {
                        setPrivacyOpen(false);
                        setPrivacyClosing(false);
                    }, 200);
                }}
            />
            {redirect && (
                <RedirectModal
                    isOpen
                    onClose={() => setRedirect(null)}
                    destination={redirect.destination}
                    url={redirect.url}
                />
            )}
        </>
    );
}
