import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import MusicPlayer from '../components/MusicPlayer';
import Modal from '../components/Modal';
import PrivacyModal from '../components/PrivacyModal';
import AcknowledgementsModal from '../components/AcknowledgementsModal';

export default function AboutMePage() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('buwryy-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(false);
  const [gamingRevealed, setGamingRevealed] = useState(false);
  const [editingRevealed, setEditingRevealed] = useState(false);
  const [projectModal, setProjectModal] = useState<{ name: string; description: string; repoUrl: string; iconSrc?: string; icon?: string; downloadUrl?: string } | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyClosing, setPrivacyClosing] = useState(false);
  const [acknowledgementsOpen, setAcknowledgementsOpen] = useState(false);
  const [acknowledgementsClosing, setAcknowledgementsClosing] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('buwryy-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('buwryy-theme')) {
        setIsDark(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = (theme: 'light' | 'dark') => {
    setIsDark(theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--md-background)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}>
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
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 0',
          marginBottom: '32px',
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)' }}>arrow_back</span>
            <span className="m3-title-large" style={{ color: 'var(--md-on-surface)' }}>
              back
            </span>
          </Link>
          
          <div className="theme-toggle" style={{
            display: 'inline-flex',
            borderRadius: 'var(--md-shape-full)',
            background: 'var(--md-surface-container)',
            padding: '4px',
            boxShadow: 'var(--md-elevation-1)',
          }}>
            <button
              onClick={() => toggleTheme('light')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 20px',
                borderRadius: 'var(--md-shape-full)',
                background: !isDark ? 'var(--md-primary)' : 'transparent',
                color: !isDark ? 'var(--md-on-primary)' : 'var(--md-on-surface)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s var(--md-motion-spring-bouncy)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>light_mode</span>
            </button>
            <button
              onClick={() => toggleTheme('dark')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 20px',
                borderRadius: 'var(--md-shape-full)',
                background: isDark ? 'var(--md-primary)' : 'transparent',
                color: isDark ? 'var(--md-on-primary)' : 'var(--md-on-surface)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s var(--md-motion-spring-bouncy)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dark_mode</span>
            </button>
          </div>
        </header>

        <section style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--md-shape-large)',
              background: 'var(--md-secondary-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--md-on-secondary-container)' }}>person</span>
            </div>
            <div>
              <h1 className="m3-headline-large" style={{ color: 'var(--md-on-surface)', margin: 0 }}>
                about me
              </h1>
            </div>
          </div>

          <div className="m3-card-elevated" style={{ marginBottom: '24px' }}>
            <h2 className="m3-title-large" style={{ marginBottom: '16px' }}>who am i?</h2>
            <p className="m3-body-large" style={{ color: 'var(--md-on-surface-variant)', lineHeight: '1.6' }}>
              i am an editor, mostly known for my unique editing style in the roblox editing community. i also do coding as a side hobby, and am currently in a cs major
            </p>
            <p className="m3-body-large" style={{ color: 'var(--md-on-surface-variant)', lineHeight: '1.6', marginTop: '16px' }}>
              make sure to <strong><a href="https://tiktok.com/@buwryy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--md-primary)', textDecoration: 'none' }}>check out my edits</a></strong> :p
            </p>
          </div>

          <div className="m3-card-elevated">
            <h2 className="m3-title-large" style={{ marginBottom: '16px' }}>my interests, hobbies</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: editingRevealed || gamingRevealed ? '16px' : '0' }}>
              <button
                className="m3-chip"
                onClick={() => {
                  setEditingRevealed(!editingRevealed);
                  if (!editingRevealed) {
                    setGamingRevealed(false);
                    setMusicPlayerVisible(false);
                  }
                }}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s var(--md-motion-spring-bouncy)',
                  background: editingRevealed ? 'var(--md-primary)' : 'var(--md-primary-container)',
                  color: editingRevealed ? 'var(--md-on-primary)' : 'var(--md-on-primary-container)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (!editingRevealed) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--md-elevation-1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>videocam</span>
                software i use to edit
                {editingRevealed && <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>}
              </button>

              <button
                className="m3-chip"
                onClick={() => {
                  setMusicPlayerVisible(!musicPlayerVisible);
                  if (!musicPlayerVisible) {
                    setEditingRevealed(false);
                    setGamingRevealed(false);
                  }
                }}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s var(--md-motion-spring-bouncy)',
                  background: musicPlayerVisible ? 'var(--md-tertiary)' : 'var(--md-tertiary-container)',
                  color: musicPlayerVisible ? 'var(--md-on-tertiary)' : 'var(--md-on-tertiary-container)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (!musicPlayerVisible) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--md-elevation-1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>music_note</span>
                music i like
                {musicPlayerVisible && <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>}
              </button>
            </div>

            {/* Editing Reveal */}
            {editingRevealed && (
              <div className="animate-slide-up" style={{ 
                background: 'var(--md-surface-container)',
                borderRadius: 'var(--md-shape-medium)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img 
                    src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/after-effects/default.svg" 
                    alt="Adobe After Effects" 
                    style={{ 
                      width: '48px', 
                      height: '48px',
                    }}
                  />
                  <div>
                    <p className="m3-title-medium" style={{ margin: 0 }}>adobe after effects 2020</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>my go-to editing software</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg width="48" height="48" viewBox="0 0 16 16">
                    <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z" fill="currentColor"/>
                  </svg>
                  <div>
                    <p className="m3-title-medium" style={{ margin: 0 }}>tiktok</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>where i post my editing content</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img 
                    src="/assets/logo.svg" 
                    alt="buwryy.net" 
                    style={{ 
                      width: '48px', 
                      height: '48px',
                    }}
                  />
                  <div>
                    <p className="m3-title-medium" style={{ margin: 0 }}>this website</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>for posting to tiktok losslessly</p>
                  </div>
                </div>
              </div>
            )}



            {/* Music Reveal - Inline Music Player */}
            {musicPlayerVisible && (
              <div className="animate-slide-up" style={{ 
                background: 'var(--md-surface-container)',
                borderRadius: 'var(--md-shape-medium)',
                padding: '16px',
                marginTop: '16px',
              }}>
                <MusicPlayer inline={true} />
              </div>
            )}

            {/* Projects Section */}
            <div style={{ marginTop: '24px' }}>
              <h3 className="m3-title-medium" style={{ marginBottom: '16px' }}>projects</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div 
                  className="m3-card" 
                  style={{ padding: '16px', cursor: 'pointer', transition: 'all 0.2s var(--md-motion-spring-bouncy)' }}
                  onClick={() => setProjectModal({ name: 'sharptape', description: 'topaz video ai alternative for linux. made with gtk4/libadwaita', repoUrl: 'https://github.com/buwryme/sharptape', iconSrc: '/assets/sharptape.svg', downloadUrl: 'https://github.com/buwryme/sharptape/releases' })}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--md-elevation-1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <img src="/assets/sharptape.svg" alt="sharptape" style={{ width: '48px', height: '48px', marginBottom: '12px' }} />
                  <p className="m3-title-medium" style={{ margin: 0 }}>sharptape</p>
                  <p className="m3-body-small" style={{ margin: '4px 0 0 0', color: 'var(--md-on-surface-variant)' }}>topaz video ai alternative for linux</p>
                </div>
                <div 
                  className="m3-card" 
                  style={{ padding: '16px', cursor: 'pointer', transition: 'all 0.2s var(--md-motion-spring-bouncy)' }}
                  onClick={() => setProjectModal({ name: 'tikutils', description: 'patch tiktok videos to upload losslessly & download/analyze videos. made with gtk4/libadwaita', repoUrl: 'https://github.com/buwryme/tikutils', iconSrc: '/assets/tikutils.svg', downloadUrl: 'https://github.com/buwryme/tikutils/releases' })}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--md-elevation-1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <img src="/assets/tikutils.svg" alt="tikutils" style={{ width: '48px', height: '48px', marginBottom: '12px' }} />
                  <p className="m3-title-medium" style={{ margin: 0 }}>tikutils</p>
                  <p className="m3-body-small" style={{ margin: '4px 0 0 0', color: 'var(--md-on-surface-variant)' }}>patch tiktok videos losslessly</p>
                </div>
                <div 
                  className="m3-card" 
                  style={{ padding: '16px', cursor: 'pointer', transition: 'all 0.2s var(--md-motion-spring-bouncy)' }}
                  onClick={() => setProjectModal({ name: 'vkintox', description: 'roblox shaders like reshade for sober, an android runtime for linux!', repoUrl: 'https://github.com/buwryme/vkintox', icon: 'sports_esports' })}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--md-elevation-1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', color: 'var(--md-primary)' }}>sports_esports</span>
                  <p className="m3-title-medium" style={{ margin: 0 }}>vkintox</p>
                  <p className="m3-body-small" style={{ margin: '4px 0 0 0', color: 'var(--md-on-surface-variant)' }}>roblox shaders for linux</p>
                </div>
                <div 
                  className="m3-card" 
                  style={{ padding: '16px', cursor: 'pointer', transition: 'all 0.2s var(--md-motion-spring-bouncy)' }}
                  onClick={() => setProjectModal({ name: 'this website', description: 'this website is fully open source!', repoUrl: 'https://github.com/buwryme/buwryy.net', iconSrc: '/assets/logo.svg' })}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--md-elevation-1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <img src="/assets/logo.svg" alt="this website" style={{ width: '48px', height: '48px', marginBottom: '12px' }} />
                  <p className="m3-title-medium" style={{ margin: 0 }}>this website</p>
                  <p className="m3-body-small" style={{ margin: '4px 0 0 0', color: 'var(--md-on-surface-variant)' }}>this website is fully open source!</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <PrivacyModal isOpen={privacyOpen} isClosing={privacyClosing} onClose={() => {
        setPrivacyClosing(true);
        setTimeout(() => {
          setPrivacyOpen(false);
          setPrivacyClosing(false);
        }, 200);
      }} />
      <AcknowledgementsModal isOpen={acknowledgementsOpen} isClosing={acknowledgementsClosing} onClose={() => {
        setAcknowledgementsClosing(true);
        setTimeout(() => {
          setAcknowledgementsOpen(false);
          setAcknowledgementsClosing(false);
        }, 200);
      }} />
      
      {/* Project Modal */}
      <Modal
        isOpen={!!projectModal}
        onClose={() => setProjectModal(null)}
        title={projectModal?.name || ''}
        titleIcon={
          projectModal?.iconSrc ? (
            <img src={projectModal.iconSrc} alt={projectModal.name} style={{ width: '32px', height: '32px' }} />
          ) : projectModal?.icon ? (
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--md-primary)' }}>{projectModal.icon}</span>
          ) : null
        }
        actions={
          <>
            <button className="m3-btn-tonal" onClick={() => setProjectModal(null)}>
              close
            </button>
            {projectModal?.downloadUrl && (
              <a 
                href={projectModal.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="m3-btn-tonal"
                style={{ textDecoration: 'none' }}
              >
                <span className="material-symbols-outlined">download</span>
                download
              </a>
            )}
            {projectModal?.repoUrl && (
              <a 
                href={projectModal.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="m3-btn-filled"
                style={{ textDecoration: 'none' }}
              >
                <span className="material-symbols-outlined">open_in_new</span>
                view repo
              </a>
            )}
          </>
        }
      >
        <p style={{ marginBottom: '16px' }}>{projectModal?.description}</p>
      </Modal>

      <Footer 
        onPrivacyClick={() => setPrivacyOpen(true)}
        onAcknowledgementsClick={() => setAcknowledgementsOpen(true)}
      />
    </div>
  );
}
