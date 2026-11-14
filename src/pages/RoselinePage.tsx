import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import PageBackdrop from '../components/PageBackdrop';
import Footer from '../components/Footer';
import PrivacyModal from '../components/PrivacyModal';
import AcknowledgementsModal from '../components/AcknowledgementsModal';
import RedirectModal from '../components/RedirectModal';
import { useSiteTheme } from '../lib/useSiteTheme';
import { ROSELINE_NAV } from '../lib/roselineNav';
import './RoselinePage.css';

const INSTALL = 'curl -fsSL https://buwryy.net/api/roseline/setup-script | bash';
const GITHUB = 'https://github.com/buwryme/Roseline';
const README = 'https://github.com/buwryme/Roseline#install';
const ISSUES = 'https://github.com/buwryme/Roseline/issues';
const DISCORD = 'https://discord.gg/HrUrzXAxPV';

export default function RoselinePage()
{
    const { isDark, setTheme } = useSiteTheme();
    const location = useLocation();
    const [copied, setCopied] = useState(false);
    const [activeNav, setActiveNav] = useState('overview');
    const [redirect, setRedirect] = useState<{ destination: string; url: string } | null>(null);
    const [privacyOpen, setPrivacyOpen] = useState(false);
    const [privacyClosing, setPrivacyClosing] = useState(false);
    const [acknowledgementsOpen, setAcknowledgementsOpen] = useState(false);
    const [acknowledgementsClosing, setAcknowledgementsClosing] = useState(false);

    useEffect(() => {
        const update = () => {
            const marker = window.scrollY + 180;
            const features = document.getElementById('features');
            const looks = document.getElementById('looks');

            if (looks && marker >= looks.offsetTop) setActiveNav('looks');
            else if (features && marker >= features.offsetTop) setActiveNav('features');
            else setActiveNav('overview');
        };

        update();
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, []);

    useEffect(() => {
        const previous = document.title;
        document.title = 'Roséline — Roblox’s macOS build, on Linux';
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

    const copyInstall = async () => {
        try { await navigator.clipboard.writeText(INSTALL); } catch { /* clipboard can be blocked */ }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
    };

    return (
        <>
            <div className="rl-page">
                <PageBackdrop cookieSize={520} />
                <div className="page-shell">
                    <SiteHeader isDark={isDark} onThemeChange={setTheme} nav={ROSELINE_NAV} activeNav={activeNav} />

                    <main className="rl-main">
                        <section className="rl-hero animate-slide-up">
                            <img className="rl-icon" src="/assets/roseline.svg" alt="" width={112} height={112} />

                            <h1 className="m3-display-large m3-emphasized rl-title">Roséline.</h1>

                            <p className="m3-body-large rl-sub">Run the macOS builds of Roblox, on Linux.</p>

                            <div className="rl-install">
                                <div className="rl-install-card">
                                    <div className="rl-install-main">
                                        <div className="rl-install-copy">
                                            <p className="rl-install-label">install</p>
                                            <code className="rl-install-cmd">{INSTALL}</code>
                                        </div>
                                        <button
                                            type="button"
                                            className="rl-copy"
                                            onClick={copyInstall}
                                            aria-label={copied ? 'Copied' : 'Copy install command'}
                                        >
                                            {copied ? (
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z" /></svg>
                                            )}
                                        </button>
                                    </div>
                                    <div className="rl-install-foot">
                                        <span className="rl-install-meta">v0.1.4 · GPL-3.0-or-later · x86_64 + ARM64</span>
                                        <button
                                            type="button"
                                            className="rl-install-more"
                                            onClick={() => setRedirect({ destination: 'github', url: README })}
                                        >
                                            other install methods
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rl-features" id="features">
                            <div className="rl-section-head">
                                <h2 className="m3-headline-large">Features:</h2>
                            </div>

                            <ul className="rl-list">
                                <li>
                                    <span className="rl-num">01</span>
                                    <div>
                                        <h3>Ease of use.</h3>
                                        <p>
                                            Roséline is built to be easy to use. Rosemary and its manager, Butter,
                                            can be too complicated for beginners, so Roséline does all of the setup
                                            for you.
                                        </p>
                                    </div>
                                </li>
                                <li>
                                    <span className="rl-num">02</span>
                                    <div>
                                        <h3>Graphics.</h3>
                                        <p>
                                            Roséline runs the macOS builds of Roblox, meaning you get better graphics
                                            than what’s on Sober. This applies for Vulkan GPUs only, as OpenGL graphics
                                            are still downgraded.
                                        </p>
                                    </div>
                                </li>
                                <li>
                                    <span className="rl-num">03</span>
                                    <div>
                                        <h3>Join <em>any</em> game.</h3>
                                        <p>
                                            Roblox does device checks for games that need integrity of players.
                                            Roséline’s integrity level is the highest possible, compared to emulated
                                            Android clients like Sober or Mocktail.
                                        </p>
                                    </div>
                                </li>
                                <li>
                                    <span className="rl-num">04</span>
                                    <div>
                                        <h3>View where the server you just joined is.</h3>
                                        <p>
                                            When you join a game, Roséline sends a notification with where your server
                                            is located.
                                        </p>
                                    </div>
                                </li>
                                <li>
                                    <span className="rl-num">05</span>
                                    <div>
                                        <h3>Overlays.</h3>
                                        <p>
                                            Override cursors, skyboxes, sounds, textures and fonts. Fonts need one
                                            import per category: Regular and Monospace.
                                        </p>
                                    </div>
                                </li>
                                <li>
                                    <span className="rl-num">06</span>
                                    <div>
                                        <h3>Encrypted sessions.</h3>
                                        <p>Session cookies save through libsecret, and are encrypted when the game closes.</p>
                                    </div>
                                </li>
                                <li>
                                    <span className="rl-num">07</span>
                                    <div>
                                        <h3>Packages.</h3>
                                        <p>
                                            Builds for Debian/Ubuntu, Fedora, Arch, AppImage, Nix and Flatpak. This also
                                            includes ARM64 computers, where Roséline works through MUVM translation
                                            when Rosemary doesn’t have an ARM64 build (yet).
                                        </p>
                                    </div>
                                </li>
                                <li>
                                    <span className="rl-num">08</span>
                                    <div>
                                        <h3>Discord RPC and GameMode.</h3>
                                        <p>
                                            Optional Discord Rich Presence, and a toggle for GameMode to get the best
                                            performance.
                                        </p>
                                    </div>
                                </li>
                                <li className="rl-list-source">
                                    <span className="rl-num">09</span>
                                    <div>
                                        <h3>Fully open source.</h3>
                                        <p>
                                            Roséline is licensed under GPL-3.0-or-later, like its foundation
                                            compatibility layer, Rosemary. Unlike Sober, all of Roséline is fully open.
                                        </p>
                                    </div>
                                    <span className="rl-list-note">
                                        …that of course doesn’t include the Roblox client itself.
                                    </span>
                                </li>
                                <li>
                                    <span className="rl-num">10</span>
                                    <div>
                                        <h3>Built-in ReShade.</h3>
                                        <p>
                                            Built-in ReShade, powered by <Link to="/vkintox" className="rl-text-link">VKIntox</Link>.
                                            Easy to install, Vulkan only.
                                        </p>
                                    </div>
                                </li>
                            </ul>
                        </section>

                        <section className="rl-native" id="looks">
                            <div className="rl-section-head">
                                <h2 className="m3-headline-large">How it looks.</h2>
                                <p className="rl-section-sub">
                                    No Electron. GTK4/Libadwaita for the UI.
                                </p>
                            </div>

                            <div className="rl-native-grid">
                                <figure className="rl-native-settings">
                                    <img
                                        src="/assets/roseline-settings.webp"
                                        alt="Roséline's settings window, with Graphics, Content, FFlags, Extras and Advanced."
                                        width={950}
                                        height={812}
                                        loading="lazy"
                                    />
                                    <figcaption>the settings app</figcaption>
                                </figure>

                                <div className="rl-native-side">
                                    <figure className="rl-native-splash">
                                        <img
                                            src="/assets/roseline-splash.webp"
                                            alt="Roséline's launch splash while Roblox starts."
                                            width={470}
                                            height={280}
                                            loading="lazy"
                                        />
                                        <figcaption>the splash while Rosemary boots the client</figcaption>
                                    </figure>

                                    <div className="rl-native-meta">
                                        <div className="rl-native-chips" aria-label="Native app details">
                                            <span>GTK4</span>
                                            <span>libadwaita</span>
                                            <span>Rust</span>
                                        </div>

                                        <div className="rl-app-spec">
                                            <span className="rl-app-spec-label">in the app</span>
                                            <dl>
                                                <div>
                                                    <dt>runner</dt>
                                                    <dd>Rosemary version, Darwin base reset, modification policy</dd>
                                                </div>
                                                <div>
                                                    <dt>fonts</dt>
                                                    <dd>regular and monospace overrides</dd>
                                                </div>
                                                <div>
                                                    <dt>flags</dt>
                                                    <dd>FastFlags and environment variables</dd>
                                                </div>
                                                <div>
                                                    <dt>session</dt>
                                                    <dd>close on leave, Discord RPC, GameMode</dd>
                                                </div>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rl-cta-section">
                            <div className="rl-cta">
                                <div>
                                    <h2 className="m3-headline-medium">We can’t wait.</h2>
                                    <p className="m3-body-large">Only one command and a few prompts. The rest is automated.</p>
                                </div>
                                <div className="rl-cta-actions">
                                    <button
                                        type="button"
                                        className="m3-btn-filled"
                                        onClick={() => setRedirect({ destination: 'github', url: GITHUB })}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                                        </svg>
                                        Star on GitHub
                                    </button>
                                    <button
                                        type="button"
                                        className="m3-btn-tonal"
                                        onClick={() => setRedirect({ destination: 'discord', url: DISCORD })}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                        </svg>
                                        Join the Discord
                                    </button>
                                </div>
                            </div>
                        </section>

                        <p className="rl-beta-note">
                            <span>
                                Roséline, like running Roblox-on-Rosemary, is experimental. Vulkan can be slower
                                than OpenGL.
                                <br />
                                For other bugs, you can{' '}
                                <button
                                    type="button"
                                    className="rl-inline-link"
                                    onClick={() => setRedirect({ destination: 'github', url: ISSUES })}
                                >
                                    open an issue
                                </button>.
                            </span>
                        </p>
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
