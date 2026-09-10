import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import PrivacyModal from '../components/PrivacyModal';
import AcknowledgementsModal from '../components/AcknowledgementsModal';

interface Project {
  name: string;
  url: string;
  description: string;
  icon?: string;
  iconSrc?: string;
}

const projects: Project[] = [
  {
    name: 'sharptape',
    url: 'https://github.com/buwryme/sharptape',
    description: 'topaz video ai alternative for linux. made with gtk4/libadwaita',
    iconSrc: '/assets/sharptape.svg',
  },
  {
    name: 'tikutils',
    url: 'https://github.com/buwryme/tikutils',
    description: 'patch tiktok videos to upload losslessly & download/analyze videos. made with gtk4/libadwaita',
    iconSrc: '/assets/tikutils.svg',
  },
  {
    name: 'vkintox',
    url: 'https://github.com/buwryme/vkintox',
    description: 'roblox shaders like reshade for sober, an android runtime for linux!',
    icon: 'sports_esports',
  },
  {
    name: 'this website',
    url: '/',
    description: "the website you're viewing was made by me!",
    iconSrc: '/assets/logo.svg',
  },
];

export default function ProjectsPage() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('buwryy-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
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
          <Link to="/about-me" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
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
              background: 'var(--md-primary-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--md-on-primary-container)' }}>build</span>
            </div>
            <div>
              <h1 className="m3-headline-large" style={{ color: 'var(--md-on-surface)', margin: 0 }}>
                projects
              </h1>
              <p className="m3-body-medium" style={{ color: 'var(--md-on-surface-variant)', margin: 0 }}>
                projects i've made that i think are impressive
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {projects.map((project) => {
              const isInternal = project.url === '/';
              
              const content = (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--md-shape-medium)',
                    background: project.iconSrc && project.name !== 'this website' ? 'transparent' : 'var(--md-secondary-container)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}>
                    {project.iconSrc ? (
                      <img 
                        src={project.iconSrc} 
                        alt={`${project.name} icon`}
                        style={{ 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: 'var(--md-shape-medium)',
                          filter: project.name === 'this website' ? 'brightness(0) invert(1)' : 'none'
                        }}
                      />
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-on-secondary-container)' }}>
                        {project.icon}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <h2 className="m3-title-large" style={{ color: 'var(--md-on-surface)', margin: 0 }}>
                        {project.name}
                      </h2>
                      {!isInternal && (
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--md-outline)' }}>
                          open_in_new
                        </span>
                      )}
                    </div>
                    <p className="m3-body-medium" style={{ color: 'var(--md-on-surface-variant)', margin: 0, lineHeight: '1.5' }}>
                      {project.description}
                    </p>
                  </div>
                </div>
              );
              
              if (isInternal) {
                return (
                  <Link
                    key={project.name}
                    to={project.url}
                    className="m3-card-elevated project-card"
                    style={{ 
                      textDecoration: 'none', 
                      display: 'block',
                      transition: 'all 0.3s var(--md-motion-spring-smooth)',
                    }}
                  >
                    {content}
                  </Link>
                );
              }
              
              return (
                <Link
                  key={project.name}
                  to={`/projects/${project.name}`}
                  className="m3-card-elevated project-card"
                  style={{ 
                    textDecoration: 'none', 
                    display: 'block',
                    transition: 'all 0.3s var(--md-motion-spring-smooth)',
                  }}
                >
                  {content}
                </Link>
              );
            })}
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

      <Footer 
        onPrivacyClick={() => setPrivacyOpen(true)}
        onAcknowledgementsClick={() => setAcknowledgementsOpen(true)}
      />
    </div>
  );
}
