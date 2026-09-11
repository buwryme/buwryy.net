import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import MusicPlayer from '../components/MusicPlayer';
import PrivacyModal from '../components/PrivacyModal';
import AcknowledgementsModal from '../components/AcknowledgementsModal';
// import CookieDecorations from '../components/CookieDecorations'; //  Remove this import
import CookieShape from '../components/CookieShape';
import Toast from '../components/Toast';

export default function HomePage() {
  const [socialsOpen, setSocialsOpen] = useState(false);
  const [socialsClosing, setSocialsClosing] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyClosing, setPrivacyClosing] = useState(false);
  const [acknowledgementsOpen, setAcknowledgementsOpen] = useState(false);
  const [acknowledgementsClosing, setAcknowledgementsClosing] = useState(false);
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('buwryy-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [toast, setToast] = useState({ 
    message: '', 
    visible: false, 
    closing: false, 
    id: 'toast-1',
    updateKey: 0 
  });
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [typingComplete, setTypingComplete] = useState(false);
  const [showBuwryy, setShowBuwryy] = useState(false);
  const [showExclamation, setShowExclamation] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const typingText = "hey, i'm ";

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('buwryy-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-update if user hasn't manually set a preference
      if (!localStorage.getItem('buwryy-theme')) {
        setIsDark(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= typingText.length) {
        setTypedText(typingText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setTypingComplete(true);
        // Show buwryy immediately after typing completes
        setShowBuwryy(true);
        // Show exclamation after buwryy animation (6 chars * 50ms = 300ms)
        setTimeout(() => {
          setShowExclamation(true);
        }, 300);
      }
    }, 60);

    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => {
      clearInterval(typingInterval);
      clearInterval(cursorInterval);
    };
  }, []);

  const toggleTheme = (theme: 'light' | 'dark') => {
    setIsDark(theme === 'dark');
  };

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    // Destroy current toast immediately
    setToast(prev => ({ 
      ...prev,
      visible: false,
      closing: false,
    }));
    
    // Recreate toast with new message after brief delay
    setTimeout(() => {
      setToast(prev => ({ 
        ...prev,
        message, 
        visible: true, 
        closing: false,
        updateKey: prev.updateKey + 1,
      }));
      
      toastTimeoutRef.current = window.setTimeout(() => {
        setToast(prev => ({ ...prev, closing: true }));
        setTimeout(() => {
          setToast(prev => ({ ...prev, message: '', visible: false, closing: false }));
        }, 300);
      }, 3000);
    }, 50);
  };

  const handleNavClick = (section: string) => {
    if (section === 'socials') {
      setSocialsOpen(true);
    } else {
      showToast('not implemented yet');
    }
  };

  return (
    <>
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--md-background)',
      position: 'relative',
      overflow: 'hidden',
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
        {/* BIG SIDE COOKIE - Keep this one */}
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

      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1200px',
        width: '85%',
        margin: '0 auto',
        padding: '24px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <header className="animate-fade-in" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 0',
          marginBottom: '32px',
        }}>
          <Link to="/" className="header-logo-link" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <Logo />
            <span className="m3-title-large" style={{ color: 'var(--md-on-surface)' }}>
              buwryy<span style={{ color: 'var(--md-on-surface-variant)' }}>.net</span>
            </span>
          </Link>
          
          <div className="theme-toggle" style={{
            display: 'inline-flex',
            borderRadius: 'var(--md-shape-full)',
            background: 'var(--md-surface-container)',
            padding: '4px',
            gap: '0',
            boxShadow: 'var(--md-elevation-1)',
          }}>
            <button
              onClick={() => toggleTheme('light')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: 'var(--md-shape-full)',
                background: !isDark ? 'var(--md-primary)' : 'transparent',
                color: !isDark ? 'var(--md-on-primary)' : 'var(--md-on-surface)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s var(--md-motion-spring-bouncy)',
                fontFamily: "'Google Sans Flex', sans-serif",
                fontWeight: 500,
                fontSize: '14px',
              }}
              aria-label="Light mode"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>light_mode</span>
            </button>
            <button
              onClick={() => toggleTheme('dark')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: 'var(--md-shape-full)',
                background: isDark ? 'var(--md-primary)' : 'transparent',
                color: isDark ? 'var(--md-on-primary)' : 'var(--md-on-surface)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s var(--md-motion-spring-bouncy)',
                fontFamily: "'Google Sans Flex', sans-serif",
                fontWeight: 500,
                fontSize: '14px',
              }}
              aria-label="Dark mode"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dark_mode</span>
            </button>
          </div>
        </header>

        <section className="animate-slide-up" style={{ marginBottom: '48px' }}>
          <div style={{ marginBottom: '16px' }}>
            <span className="m3-chip" style={{
              background: '#FFE8F0',
              color: '#8B3A5A',
              border: 'none',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
              welcome
            </span>
          </div>
          
          <h1 className="m3-display-large m3-emphasized" style={{
            color: 'var(--md-on-background)',
            marginBottom: '16px',
            fontSize: 'clamp(36px, 8vw, 57px)',
            minHeight: '1.2em',
          }}>
            {typedText}
            {showBuwryy && (
              <span>
                {'buwryy'.split('').map((char, charIndex) => (
                  <span
                    key={charIndex}
                    className="char-pop gradient-text"
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
              <span style={{
                animation: 'exclamationAppear 0.2s ease-out forwards',
              }}>!</span>
            )}
            <span style={{
              opacity: showCursor ? 0.4 : 0,
              transition: 'opacity 0.1s',
              fontWeight: 300,
            }}>|</span>
          </h1>
          
          <p className="m3-body-large" style={{
            color: 'var(--md-on-surface-variant)',
            maxWidth: '500px',
            lineHeight: '1.6',
          }}>
            welcome to my website &lt;3
          </p>
        </section>

        <section className="animate-slide-up delay-200" style={{ marginBottom: '48px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div className="m3-button-group" style={{ width: '100%', maxWidth: '480px' }}>
            <Link to="/tiktok-patcher" className="m3-button-group-item" style={{ flex: 1, textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>music_note</span>
              <span>TikTok Patcher</span>
            </Link>
            <Link to="/about-me" className="m3-button-group-item" style={{ flex: 1, textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>
              <span>About Me</span>
            </Link>
            <button
              className="m3-button-group-item"
              onClick={() => handleNavClick('socials')}
              style={{ flex: 1 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>public</span>
              <span>Socials</span>
            </button>
          </div>
          {/* <CookieDecorations /> */} {/* Remove this line to remove the 3 cookies */}
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
      {musicPlayerVisible && <MusicPlayer />}
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
      <Toast message={toast.message} isVisible={toast.visible} isClosing={toast.closing} toastKey={`${toast.id}-${toast.updateKey}`} />
    </>
  );
}

function Logo() {
  return (
    <div style={{
      width: '48px',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.3s var(--md-motion-spring-bouncy)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
    }}
    >
      <img src="/assets/logo.svg" alt="buwryy.net logo" className="logo-icon" width="48" height="48" />
    </div>
  );
}

const socials = [
  { name: 'TikTok', handle: '@buwryy', icon: 'tiktok', url: 'https://tiktok.com/@buwryy' },
  { name: 'Twitter / X', handle: '@buwryme', icon: 'x', url: 'https://x.com/buwryme' },
  { name: 'GitHub', handle: 'buwryme', icon: 'github', url: 'https://github.com/buwryme' },
  { name: 'Discord', handle: 'buwryy', icon: 'discord', url: 'http://discord.com/users/1380985600773198037' },
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
    <div className={`m3-dialog-overlay ${isClosing ? 'modal-closing' : 'modal-opening'}`} onClick={onClose} style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.32)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '24px',
    }}>
      <div className={`m3-dialog ${isClosing ? 'dialog-closing' : 'dialog-opening'}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="m3-dialog-title">find me</h2>
        <div className="m3-dialog-content">
          <p style={{ marginBottom: '16px' }}>
            my socials. say hi!
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