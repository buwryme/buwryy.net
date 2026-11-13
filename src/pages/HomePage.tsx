import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import MusicPlayer from '../components/MusicPlayer';
import PrivacyModal from '../components/PrivacyModal';
import AcknowledgementsModal from '../components/AcknowledgementsModal';
import CookieShape from '../components/CookieShape';
import SiteHeader from '../components/SiteHeader';
import { HOME_NAV } from '../lib/homeNav';
import { useSiteTheme } from '../lib/useSiteTheme';
import { loadPosts, type BlogPost } from '../lib/blog';
import './HomePage.css';

export default function HomePage() {
  const location = useLocation();
  const { isDark, setTheme } = useSiteTheme();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [socialsOpen, setSocialsOpen] = useState(false);
  const [socialsClosing, setSocialsClosing] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyClosing, setPrivacyClosing] = useState(false);
  const [acknowledgementsOpen, setAcknowledgementsOpen] = useState(false);
  const [acknowledgementsClosing, setAcknowledgementsClosing] = useState(false);
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(false);
  const [activeNav, setActiveNav] = useState('home');
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [showBuwryy, setShowBuwryy] = useState(false);
  const [showExclamation, setShowExclamation] = useState(false);
  const typingText = "hey, i'm ";

  useEffect(() => {
    loadPosts().then(setPosts).catch(() => { /* the blog section just stays quiet */ });
  }, []);

  useEffect(() => {
    const update = () => {
      const marker = window.scrollY + window.innerHeight * 0.35;
      const projects = document.getElementById('projects');
      const blog = document.getElementById('blog');
      const projectTop = projects ? projects.getBoundingClientRect().top + window.scrollY : Infinity;
      const blogTop = blog ? blog.getBoundingClientRect().top + window.scrollY : Infinity;

      if (marker >= blogTop) setActiveNav('blog');
      else if (marker >= projectTop) setActiveNav('projects');
      else setActiveNav('home');
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    const timer = window.setInterval(update, 150);
    return () => {
      window.removeEventListener('scroll', update);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (location.hash === '#socials') setSocialsOpen(true);
    if (location.hash === '#projects') {
      const timer = window.setTimeout(() => {
        document.getElementById('projects')?.scrollIntoView({ block: 'start' });
      }, 500);
      return () => window.clearTimeout(timer);
    }
  }, [location.hash]);

  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = window.setInterval(() => {
      if (currentIndex <= typingText.length) {
        setTypedText(typingText.slice(0, currentIndex));
        currentIndex++;
      } else {
        window.clearInterval(typingInterval);
        setShowBuwryy(true);
        window.setTimeout(() => setShowExclamation(true), 300);
      }
    }, 40);

    const cursorInterval = window.setInterval(() => {
      setShowCursor((previous) => !previous);
    }, 530);

    return () => {
      window.clearInterval(typingInterval);
      window.clearInterval(cursorInterval);
    };
  }, []);

  const toggleTheme = (theme: 'light' | 'dark') => {
    setTheme(theme);
  };

  const handleNavClick = (section: string) => {
    if (section === 'socials') {
      setSocialsOpen(true);
    } else if (section === 'projects') {
      document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--md-background)',
      position: 'relative',
      overflowX: 'clip',
      transition: 'background-color 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
    }}>      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}>
        <div style={{
          position: 'absolute',
          right: '-160px',
          top: '40%',
          transform: 'translateY(-50%)',
          opacity: 0.12,
          filter: 'saturate(0.25) brightness(1.15) contrast(0.95)',
          animation: 'spin-clockwise 60s linear infinite',
          transformOrigin: 'center',
          pointerEvents: 'none',
          zIndex: 1,
        }}>
          <CookieShape 
            size="460px" 
            fillColor="var(--md-primary-container)" 
            strokeColor="var(--md-primary)" 
          />
        </div>

        <div className="blob-1" style={{
          position: 'absolute',
          top: '-20%',
          right: '-15%',
          width: '800px',
          height: '800px',
          background: `radial-gradient(circle at center, var(--blob-color-1) 0%, transparent 70%)`,
          opacity: 'var(--blob-opacity)',
          filter: 'blur(40px)',
        }} />
        <div className="blob-2" style={{
          position: 'absolute',
          bottom: '-25%',
          left: '-20%',
          width: '700px',
          height: '700px',
          background: `radial-gradient(circle at center, var(--blob-color-2) 0%, transparent 70%)`,
          opacity: 'var(--blob-opacity-secondary)',
          filter: 'blur(35px)',
        }} />
        <div className="blob-3" style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          width: '600px',
          height: '600px',
          background: `radial-gradient(circle at center, var(--blob-color-3) 0%, transparent 70%)`,
          opacity: 'var(--blob-opacity)',
          filter: 'blur(38px)',
        }} />
      </div>

      <div className="page-shell">
        <SiteHeader
          isDark={isDark}
          onThemeChange={toggleTheme}
          nav={HOME_NAV}
          onAction={handleNavClick}
          activeNav={activeNav}
        />

        <section className="home-hero animate-slide-up">
          <span className="m3-chip home-chip">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
            welcome
          </span>
          <h1 className="home-title">
            {typedText}
            {showBuwryy && (
              <span className="rainbow-word">
                {'buwryy'.split('').map((char, charIndex) => (
                  <span
                    key={charIndex}
                    className="char-pop"
                    style={{
                      animationDelay: `${charIndex * 50}ms`,
                      display: 'inline-block',
                    }}
                  >
                    {char}
                  </span>
                ))}
              </span>
            )}
            {showExclamation && (
              <span style={{ animation: 'exclamationAppear 0.2s ease-out forwards' }}>!</span>
            )}
            <span style={{ opacity: showCursor ? 0.4 : 0, transition: 'opacity 0.1s', fontWeight: 300 }}>|</span>
          </h1>
          <p className="home-lede">
            welcome to my website! it is very cool please check it out i took my dear time to make this :&gt;
          </p>
          <div className="home-actions">
            <Link to="/vkintox" className="m3-btn-filled">see VKIntox</Link>
            <Link to="/blog" className="m3-btn-tonal">read my blog</Link>
          </div>
        </section>

        <section id="about" className="home-section">
          <div className="home-section-head">
            <h2>about me</h2>
          </div>
          <div className="home-about">
            <div className="home-about-copy">
              <p>
                i am an editor, mostly known for my editing style in the Roblox editing
                community. i also code as a side hobby and am currently doing a CS major.
              </p>
              <button
                type="button"
                className="m3-btn-tonal home-music-toggle"
                onClick={() => setMusicPlayerVisible((visible) => !visible)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>music_note</span>
                {musicPlayerVisible ? 'hide the player' : 'music i like...'}
              </button>
              {musicPlayerVisible && (
                <div className="home-music-player">
                  <MusicPlayer inline />
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="projects" className="home-section">
          <div className="home-section-head">
            <h2>projects</h2>
            <p className="home-aside-right">
              RIP python Sharptape,
              <br />
              you are going to get rewritten in Rust
            </p>
          </div>
          <div className="home-projects">
            {PROJECTS.map((project) => {
              const body = (
                <>
                  <img src={project.icon} alt="" width={42} height={42} />
                  <span>
                    <strong>{project.name}</strong>
                    <small>{project.tagline}</small>
                  </span>
                </>
              );

              return project.to ? (
                <Link key={project.name} to={project.to} className="home-project">
                  {body}
                </Link>
              ) : (
                <a key={project.name} href={project.href} className="home-project">
                  {body}
                </a>
              );
            })}
          </div>
        </section>

        <section id="blog" className="home-section">
          <div className="home-section-head">
            <h2>blog</h2>
            <Link to="/blog" className="home-section-link">all posts</Link>
          </div>
          {posts.length ? (
            <div className="home-blog-list">
              {posts.slice(0, 2).map((post) => (
                <Link key={post.slug} to={`/blog/${post.slug}`} className="home-blog-card">
                  <span>{new Date(post.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <strong>{post.title}</strong>
                  {post.summary && <p>{post.summary}</p>}
                </Link>
              ))}
            </div>
          ) : (
            <p className="home-muted">the gist is quiet right now.</p>
          )}
        </section>

        <Footer 
          onPrivacyClick={() => setPrivacyOpen(true)}
          onAcknowledgementsClick={() => setAcknowledgementsOpen(true)}
        />
      </div>



      <SocialsModal isOpen={socialsOpen} isClosing={socialsClosing} onClose={() => {
        setSocialsClosing(true);
        setTimeout(() => {
          setSocialsOpen(false);
          setSocialsClosing(false);
        }, 300);
      }} />
      <AcknowledgementsModal isOpen={acknowledgementsOpen} isClosing={acknowledgementsClosing} onClose={() => {
        setAcknowledgementsClosing(true);
        setTimeout(() => {
          setAcknowledgementsOpen(false);
          setAcknowledgementsClosing(false);
        }, 200);
      }} />
      <PrivacyModal isOpen={privacyOpen} isClosing={privacyClosing} onClose={() => {
        setPrivacyClosing(true);
        setTimeout(() => {
          setPrivacyOpen(false);
          setPrivacyClosing(false);
        }, 200);
      }} />
      </div>
    </>
  );
}

const PROJECTS: { name: string; tagline: string; icon: string; href?: string; to?: string }[] = [
  { name: 'sharptape', tagline: 'topaz video ai alternative for linux', icon: '/assets/sharptape.svg', href: 'https://github.com/buwryme/sharptape' },
  { name: 'tikutils', tagline: 'patch tiktok videos losslessly', icon: '/assets/tikutils.svg', href: 'https://github.com/buwryme/tikutils' },
  { name: 'vkintox', tagline: 'reshade with proper depth, for linux', icon: '/assets/vkintox.svg', to: '/vkintox' },
  { name: 'roséline', tagline: "run roblox's macos builds on linux", icon: '/assets/roseline.svg', href: 'https://github.com/buwryme/Roseline' },
  { name: 'this website', tagline: 'this website is open source, too!\ndid you know it is serverless?', icon: '/assets/logo.svg', href: 'https://github.com/buwryme/buwryy.net' },
];

const socials = [
  { name: 'TikTok', handle: '@buwryy', icon: 'tiktok', url: 'https://tiktok.com/@buwryy' },
  { name: 'Twitter / X', handle: '@buwryme', icon: 'x', url: 'https://x.com/buwryme' },
  { name: 'GitHub', handle: 'buwryme', icon: 'github', url: 'https://github.com/buwryme' },
  { name: 'Discord', handle: 'Join server', icon: 'discord', url: 'https://discord.gg/HrUrzXAxPV' },
  { name: 'Email', handle: 'hello@buwryy.net', icon: 'email', url: 'mailto:hello@buwryy.net' },
];

function TikTokIcon() {
  return (
    <svg width="26" height="26" viewBox="-1 -1 18 18" className="social-icon">
      <path className="social-icon-outline" d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z" fill="none" stroke="currentColor" strokeWidth="1.2"/>
      <path className="social-icon-filled" d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z" fill="currentColor"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="26" height="26" viewBox="-0.5 -0.5 17 16" className="social-icon">
      <path className="social-icon-outline" d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" fill="none" stroke="currentColor" strokeWidth="0.8"/>
      <path className="social-icon-filled" d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" fill="currentColor"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="26" height="26" viewBox="-1 -1 26 26" className="social-icon">
      <path className="social-icon-outline" d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path className="social-icon-filled" d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" fill="currentColor"/>
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="26" height="26" viewBox="-1 -1 26 26" className="social-icon">
      <path className="social-icon-outline" d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path className="social-icon-filled" d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="currentColor"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="26" height="26" viewBox="-1 -1 26 26" className="social-icon">
      <path className="social-icon-outline" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path className="social-icon-filled" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/>
    </svg>
  );
}

function SocialIcon({ type }: { type: string }) {
  const style = { width: '20px', height: '20px', color: 'var(--md-primary)' };
  switch (type) {
    case 'tiktok': return <span style={style}><TikTokIcon /></span>;
    case 'x': return <span style={style}><XIcon /></span>;
    case 'github': return <span style={style}><GitHubIcon /></span>;
    case 'discord': return <span style={style}><DiscordIcon /></span>;
    case 'email': return <span style={style}><EmailIcon /></span>;
    default: return null;
  }
}

function SocialsModal({ isOpen, isClosing, onClose }: { isOpen: boolean; isClosing: boolean; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className={`m3-dialog-overlay ${isClosing ? 'modal-closing' : 'modal-opening'}`} onClick={onClose}>
      <div className={`m3-dialog ${isClosing ? 'dialog-closing' : 'dialog-opening'}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="m3-dialog-title">find me</h2>
        <div className="m3-dialog-content">
          <p style={{ marginBottom: '16px' }}>
            everywhere you can contact me. say hello!!!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {socials.map((social) => (
              <a
                key={social.name}
                href={social.url}
                className="m3-list-item"
                target={social.url.startsWith('mailto') ? undefined : '_blank'}
                rel="noopener noreferrer"
              >
                <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SocialIcon type={social.icon} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="m3-title-medium" style={{ color: 'var(--md-on-surface)' }}>
                    {social.name}
                  </div>
                  <div className="m3-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
                    {social.handle}
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--md-outline)', fontSize: '18px' }}>arrow_forward</span>
              </a>
            ))}
          </div>
        </div>
        <div className="m3-dialog-actions">
          <button className="m3-btn-tonal" onClick={onClose}>
            close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}