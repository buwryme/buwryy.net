import { useState, useRef, useEffect } from 'react';
import WavyProgressBar from './WavyProgressBar';

interface MusicPlayerProps {
  inline?: boolean;
}

export default function MusicPlayer({ inline = false }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // iTunes preview URL for "big feelings" by Ariana Grande
  const previewUrl = 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/01/b5/96/01b596a4-d1f7-c683-6019-d6520d2e68c5/mzaf_17013766028288023782.plus.aac.p.m4a';
  
  // Album cover URL for "petal" by Ariana Grande
  const albumArtUrl = 'https://portalpopline.com.br/wp-content/uploads/2026/04/ariana-grande-petal.jpg';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: inline ? 'relative' : 'fixed',
      bottom: inline ? 'auto' : '80px',
      left: inline ? 'auto' : '50%',
      transform: inline ? 'none' : 'translateX(-50%)',
      width: inline ? '100%' : '90%',
      maxWidth: inline ? 'none' : '600px',
      background: inline ? 'transparent' : 'var(--md-surface-container-high)',
      borderRadius: inline ? '0' : 'var(--md-shape-large)',
      boxShadow: inline ? 'none' : 'var(--md-elevation-3)',
      padding: inline ? '0' : '16px',
      zIndex: inline ? 'auto' : 100,
      transition: 'all 0.3s var(--md-motion-spring-bouncy)',
    }}>
      <audio ref={audioRef} src={previewUrl} preload="metadata" />
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        {/* Album Art Container */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--md-shape-medium)',
          overflow: 'hidden',
          flexShrink: 0,
          position: 'relative',
        }}>
          {/* Album Art Inside Container */}
          <div style={{
            width: '100%',
            height: '100%',
          }}>
            <img 
              src={albumArtUrl}
              alt="petal album cover"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                // Fallback to gradient if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.style.background = 'linear-gradient(135deg, var(--md-primary-container) 0%, var(--md-tertiary-container) 100%)';
                e.currentTarget.parentElement!.style.display = 'flex';
                e.currentTarget.parentElement!.style.alignItems = 'center';
                e.currentTarget.parentElement!.style.justifyContent = 'center';
                const fallbackIcon = document.createElement('span');
                fallbackIcon.className = 'material-symbols-outlined';
                fallbackIcon.style.fontSize = '32px';
                fallbackIcon.style.color = 'var(--md-on-primary-container)';
                fallbackIcon.textContent = 'album';
                e.currentTarget.parentElement!.appendChild(fallbackIcon);
              }}
            />
          </div>
        </div>

        {/* Song Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="m3-title-medium" style={{ margin: 0, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            big feelings
          </h3>
          <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Ariana Grande - petal
          </p>
        </div>

        {/* Controls */}
        <button
          onClick={togglePlay}
          className="m3-btn-filled"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            padding: 0,
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
      </div>

      {/* Wavy Progress Bar */}
      <WavyProgressBar 
        progress={duration > 0 ? currentTime / duration : 0}
        duration={duration}
        currentTime={currentTime}
        isPlaying={isPlaying}
      />
    </div>
  );
}
