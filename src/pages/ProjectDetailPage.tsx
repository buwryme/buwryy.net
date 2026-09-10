import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Footer from '../components/Footer';
import PrivacyModal from '../components/PrivacyModal';
import AcknowledgementsModal from '../components/AcknowledgementsModal';
import Toast from '../components/Toast';

interface ProjectData {
  name: string;
  description: string;
  repoUrl: string;
  icon?: string;
  iconSrc?: string;
}

const projectsData: Record<string, ProjectData> = {
  sharptape: {
    name: 'sharptape',
    description: 'lorem ipsum dolor sit amet, consectetur adipiscing elit. sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    repoUrl: 'https://github.com/buwryme/sharptape',
    iconSrc: '/assets/sharptape.svg',
  },
  tikutils: {
    name: 'tikutils',
    description: 'lorem ipsum dolor sit amet, consectetur adipiscing elit. sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    repoUrl: 'https://github.com/buwryme/tikutils',
    iconSrc: '/assets/tikutils.svg',
  },
  vkintox: {
    name: 'vkintox',
    description: 'lorem ipsum dolor sit amet, consectetur adipiscing elit. sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    icon: 'sports_esports',
    repoUrl: 'https://github.com/buwryme/vkintox',
  },
};

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('buwryy-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [toast, setToast] = useState({ message: '', visible: false, closing: false, id: 'toast-1', updateKey: 0 });
  const toastTimeoutRef = useRef<number | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyClosing, setPrivacyClosing] = useState(false);
  const [acknowledgementsOpen, setAcknowledgementsOpen] = useState(false);
  const [acknowledgementsClosing, setAcknowledgementsClosing] = useState(false);

  const project = projectId ? projectsData[projectId] : null;

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

  const handleDownload = () => {
    showToast('not implemented yet');
  };

  if (!project) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'var(--md-background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 className="m3-headline-large" style={{ color: 'var(--md-on-surface)', marginBottom: '16px' }}>
            project not found
          </h1>
          <Link to="/about-me/projects" className="m3-btn-filled" style={{ textDecoration: 'none' }}>
            <span className="material-symbols-outlined">arrow_back</span>
            back to projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
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
            background: `radial-gradient(circle at center, ${isDark ? 'var(--blob-color-1)' : 'var(--md-primary-container)'} 0%, transparent 70%)`,
            opacity: isDark ? 'var(--blob-opacity)' : '0.3',
            filter: 'blur(40px)',
          }} />
          <div className="blob-2" style={{
            position: 'absolute',
            bottom: '-25%',
            left: '-20%',
            width: '700px',
            height: '700px',
            background: `radial-gradient(circle at center, ${isDark ? 'var(--blob-color-2)' : 'var(--md-secondary-container)'} 0%, transparent 70%)`,
            opacity: isDark ? 'var(--blob-opacity-secondary)' : '0.25',
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
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}>
          <header style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 0',
            marginBottom: '32px',
          }}>
            <Link to="/about-me/projects" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
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

          <section style={{ flex: 1, marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
              <div style={{
                width: '96px',
                height: '96px',
                borderRadius: 'var(--md-shape-large)',
                background: project.iconSrc ? 'transparent' : 'var(--md-secondary-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {project.iconSrc ? (
                  <img 
                    src={project.iconSrc} 
                    alt={`${project.name} icon`}
                    style={{ width: '96px', height: '96px' }}
                  />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--md-on-secondary-container)' }}>
                    {project.icon}
                  </span>
                )}
              </div>
              <div>
                <h1 className="m3-headline-large" style={{ color: 'var(--md-on-surface)', margin: 0, marginBottom: '8px' }}>
                  {project.name}
                </h1>
                <p className="m3-body-medium" style={{ color: 'var(--md-on-surface-variant)', margin: 0 }}>
                  project details
                </p>
              </div>
            </div>

            <div className="m3-card-elevated" style={{ marginBottom: '24px' }}>
              <h2 className="m3-title-large" style={{ marginBottom: '16px' }}>about</h2>
              <p className="m3-body-large" style={{ color: 'var(--md-on-surface-variant)', lineHeight: '1.6' }}>
                {project.description}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={handleDownload}
                className="m3-btn-filled"
                style={{
                  padding: '12px 32px',
                  fontSize: '16px',
                }}
              >
                <span className="material-symbols-outlined">download</span>
                download
              </button>
              
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="m3-btn-outlined"
                style={{
                  padding: '12px 32px',
                  fontSize: '16px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span className="material-symbols-outlined">open_in_new</span>
                view repo
              </a>
            </div>
          </section>

          <Footer 
            onPrivacyClick={() => setPrivacyOpen(true)}
            onAcknowledgementsClick={() => setAcknowledgementsOpen(true)}
          />
        </div>
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
      <Toast message={toast.message} isVisible={toast.visible} isClosing={toast.closing} toastKey={`${toast.id}-${toast.updateKey}`} />
    </>
  );
}


