import { useState, useRef, useEffect, useMemo } from 'react';
import './MusicPlayer.css';

interface MusicPlayerProps {
  inline?: boolean;
}

interface Song {
  title: string;
  artist: string;
  previewUrl: string;
}

const ALBUM_SONGS: Song[] = [
  {
    title: 'petal',
    artist: 'Ariana Grande',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f8/e7/49/f8e7493f-646b-032d-70b2-c3097a0d18c6/mzaf_1782513975775586053.plus.aac.p.m4a'
  },
  {
    title: 'kiss me',
    artist: 'Ariana Grande',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b5/18/13/b518132d-1ac2-da97-8d5f-063bdb0c8c2a/mzaf_1158145135257468256.plus.aac.p.m4a'
  },
  {
    title: 'hate that i made you love me',
    artist: 'Ariana Grande',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/cd/fb/65/cdfb65fe-7d80-abde-0153-d698d1e7bde1/mzaf_14991009929085569283.plus.aac.p.m4a'
  },
  {
    title: 'stay',
    artist: 'Ariana Grande',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/7e/e4/a3/7ee4a349-2aec-de7b-ab6d-912de1dc237b/mzaf_14980222122460649010.plus.aac.p.m4a'
  },
  {
    title: 'oh well',
    artist: 'Ariana Grande',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/67/69/26/67692644-9d16-4d47-a34d-51be3a32acbb/mzaf_5081255620500423425.plus.aac.p.m4a'
  },
  {
    title: 'big feelings',
    artist: 'Ariana Grande',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/01/b5/96/01b596a4-d1f7-c683-6019-d6520d2e68c5/mzaf_17013766028288023782.plus.aac.p.m4a'
  },
  {
    title: 'freak',
    artist: 'Ariana Grande',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a0/24/aa/a024aad7-d463-ac67-f617-726e2ff1bb03/mzaf_16182808144601216020.plus.aac.p.m4a'
  },
  {
    title: 'warning signs (interlude)',
    artist: 'Ariana Grande',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/5a/49/ee/5a49eea5-de1c-0966-be50-454d5ccf4e42/mzaf_17099882468446966474.plus.aac.p.m4a'
  },
  {
    title: 'like i do',
    artist: 'Ariana Grande',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/12/20/bb/1220bb18-7590-9e7c-a6ed-beca1dc47620/mzaf_667380891852406034.plus.aac.p.m4a'
  },
  {
    title: 'never get over me',
    artist: 'Ariana Grande',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/09/7a/5c/097a5c8e-2e56-2439-bf46-d46b8cf37bbc/mzaf_8427852479843176740.plus.aac.p.m4a'
  },
  {
    title: 'bad thing (bunny hop)',
    artist: 'Ariana Grande',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/ab/39/f7/ab39f773-6d8f-631e-f2d2-28c900a9e768/mzaf_3916014710699297524.plus.aac.p.m4a'
  },
  {
    title: 'nowhere, nobody',
    artist: 'Ariana Grande',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f6/e7/8a/f6e78ac8-4fe6-0917-9c79-0760d61b6e7f/mzaf_16206100986765788619.plus.aac.p.m4a'
  }
];

export default function MusicPlayer({ inline = false }: MusicPlayerProps) {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);
  
  // Track continuous rotation offset so it plays from where it was paused
  const rotationOffsetRef = useRef(0);
  const [rotation, setRotation] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSong = ALBUM_SONGS[currentSongIndex];
  const albumArtUrl = 'https://portalpopline.com.br/wp-content/uploads/2026/04/ariana-grande-petal.jpg';

  // Handle track changing: reset rotation, times, reload and play
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTime(0);
    setRotation(0);
    rotationOffsetRef.current = 0;

    // Load new audio source
    audio.load();

    if (isPlaying) {
      audio.play().catch((err) => {
        console.error("Playback failed on track switch:", err);
        setIsPlaying(false);
      });
    }
  }, [currentSongIndex]);

  // Animation loop for smooth time and rotation updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Nothing should keep advancing the visual position while paused.
    if (!isPlaying && !isDragging) return;

    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }

      // Continuous rotation accumulation while playing. Dragging only updates
      // the seek thumb; it must not advance the rotation.
      // NOTE: intentionally NOT wrapped with `% 360` — wrapping the value
      // caused a visible reverse-spin glitch every ~20s, because the
      // snap-back transition on .album-art-circle would animate the sudden
      // jump from ~360deg back to 0deg the long way around.
      if (isPlaying) {
        rotationOffsetRef.current = rotationOffsetRef.current + delta * 18;
        setRotation(rotationOffsetRef.current);
      }

      if (isPlaying || isDragging) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, isDragging]);

  // Handle snap back of circle rotation to original state ONLY when paused
  useEffect(() => {
    if (!isPlaying) {
      setRotation(0);
      rotationOffsetRef.current = 0; // Starts from scratch next play
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      // Advance to next song in list automatically
      setCurrentSongIndex((prevIndex) => (prevIndex + 1) % ALBUM_SONGS.length);
    };

    // Ground-truth position source. requestAnimationFrame is throttled or
    // fully paused by the browser on hidden/unfocused tabs, which let
    // currentTime state freeze while audio.currentTime kept advancing —
    // that's what caused the big jump/desync when refocusing. `timeupdate`
    // is driven by the media element itself and keeps firing regardless of
    // tab visibility, so it's used here as a reliable fallback/source of
    // truth. The rAF loop still exists for smooth interpolation while the
    // tab is visible.
    const handleTimeUpdate = () => {
      if (!isDraggingRef.current) {
        setCurrentTime(audio.currentTime);
      }
    };

    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent<HTMLButtonElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    createAccentRipple(e.currentTarget);

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playPrevious = (e: React.MouseEvent<HTMLButtonElement>) => {
    createAccentRipple(e.currentTarget);
    setCurrentSongIndex((prevIndex) =>
      prevIndex === 0 ? ALBUM_SONGS.length - 1 : prevIndex - 1
    );
  };

  const playNext = (e: React.MouseEvent<HTMLButtonElement>) => {
    createAccentRipple(e.currentTarget);
    setCurrentSongIndex((prevIndex) => (prevIndex + 1) % ALBUM_SONGS.length);
  };

  const createAccentRipple = (button: HTMLButtonElement) => {
    const container = containerRef.current;
    if (!container) return;

    const buttonRect = button.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const x = buttonRect.left - containerRect.left + buttonRect.width / 2;
    const y = buttonRect.top - containerRect.top + buttonRect.height / 2;

    const ripple = document.createElement('div');
    ripple.className = 'android-ripple-wave';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    container.appendChild(ripple);
    setTimeout(() => ripple.remove(), 1000);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const container = progressRef.current;
    if (!audio || !container) return;

    const rect = container.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(percentage * duration, duration));
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);

    const updatePosition = (moveEvent: PointerEvent) => {
      const container = progressRef.current;
      const audio = audioRef.current;
      if (!audio || !container) return;

      const rect = container.getBoundingClientRect();
      const percentage = (moveEvent.clientX - rect.left) / rect.width;
      const newTime = Math.max(0, Math.min(percentage * duration, duration));
      setCurrentTime(newTime);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      const container = progressRef.current;
      const audio = audioRef.current;
      if (!audio || !container) return;

      const rect = container.getBoundingClientRect();
      const percentage = (upEvent.clientX - rect.left) / rect.width;
      const newTime = Math.max(0, Math.min(percentage * duration, duration));
      
      audio.currentTime = newTime;
      setCurrentTime(newTime);
      setIsDragging(false);

      document.removeEventListener('pointermove', updatePosition);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', updatePosition);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Wavy path for the progress bar - smooth sine wave that fades to unplayed portion.
  //
  // The wave's "flow" is driven by `currentTime` itself (not a separate
  // CSS clock/stroke-dashoffset animation). Previously the flowing motion
  // was a `stroke-dashoffset` CSS keyframe on a fixed `stroke-dasharray`
  // that was totally decoupled from the actual (much shorter) path length.
  // That produced a sliding "dash window" independent of real progress —
  // which is why the wave visually lagged behind the seek thumb, and
  // glitched every time the fixed 20s CSS animation looped. Tying the
  // phase to `currentTime` guarantees the wave can never drift out of sync
  // with the thumb/progress, since both derive from the same value.
  const wavyPath = useMemo(() => {
    const endX = progressPercentage * 10; // 0-1000 scale
    const baseWavelength = 80; // 2x frequency of the previous 160 wavelength (more wavy!)
    const flowSpeed = 60; // px of phase shift per second of playback
    const phase = currentTime * flowSpeed;
    
    let path = `M 0 30`;
    for (let x = 0; x <= endX; x += 2) {
      // Fade out wave amplitude near the end of the played portion to join seamlessly with unplayed section
      const distanceToEnd = endX - x;
      const fadeFactor = Math.min(1, distanceToEnd / 60); // Fade range of 60 units (6% of full bar width)
      const amplitude = (isPlaying ? 5 : 0) * fadeFactor;
      
      const y = 30 + Math.sin((x - phase) / baseWavelength * 2 * Math.PI) * amplitude;
      path += ` L ${x} ${y}`;
    }
    return path;
  }, [progressPercentage, currentTime, isPlaying]);

  return (
    <div className={`music-player ${inline ? 'inline' : 'fixed'}`}>
      <audio ref={audioRef} src={currentSong.previewUrl} preload="metadata" crossOrigin="anonymous" />
      
      {/* Centered wrapper */}
      <div className="music-player-wrapper">
        {/* Main card. The blurred/dimmed album cover lives *inside* this
            card (instead of as a separate, differently-sized layer behind
            it) so it exactly matches the card's bounds/corners and is
            actually visible as the card's background, instead of being
            hidden behind an almost-opaque surface fill. */}
        <div ref={containerRef} className="music-player-content">
          <div className="card-background">
            <img
              src={albumArtUrl}
              alt="album background"
              className="blur-bg"
              onError={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, var(--md-primary-container) 0%, var(--md-tertiary-container) 100%)';
              }}
            />
            <div className="background-overlay"></div>
          </div>

          {/* Circular spinning album art */}
          <div
            className={`album-art-circle ${!isPlaying ? 'snapping' : ''}`}
            style={{ transform: `rotateZ(${rotation}deg)` }}
          >
            <img
              src={albumArtUrl}
              alt="petal album cover"
              onError={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, var(--md-primary-container) 0%, var(--md-tertiary-container) 100%)';
              }}
            />
          </div>

          {/* Center: Info & Wavy Progress */}
          <div className="player-center-content">
            <div key={currentSongIndex} className="song-info track-change-animation">
              <h2 className="song-title">{currentSong.title}</h2>
              <p className="artist-album">{currentSong.artist}</p>
            </div>

            <div className="wavy-progress-container">
              <div
                ref={progressRef}
                className="progress-track"
                onClick={handleProgressClick}
                onPointerDown={handleProgressDrag}
              >
                <svg 
                  className="wavy-svg"
                  viewBox="0 0 1000 60"
                  preserveAspectRatio="none"
                >
                  {/* Unplayed - Solid track */}
                  <line
                    x1={progressPercentage * 10}
                    y1="30"
                    x2="1000"
                    y2="30"
                    stroke="var(--md-surface-variant)"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Played - Wavy track */}
                  <path
                    d={wavyPath}
                    className="wavy-fill-path"
                    stroke="var(--md-primary)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Rounded rectangular vertical seek thumb */}
                  <g transform={`translate(${progressPercentage * 10}, 30)`}>
                    <rect
                      x="-8"
                      y="-18"
                      width="16"
                      height="36"
                      rx="2.5"
                      fill="white"
                      stroke="rgba(0, 0, 0, 0.16)"
                      strokeWidth="1.5"
                    />
                  </g>
                </svg>
              </div>
              
              <div className="time-display">
                <span className="current-time">{formatTime(currentTime)}</span>
                <span className="duration-time">{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Play & Nav Controls Group */}
          <div className="controls-group">
            <button
              onClick={playPrevious}
              className="control-btn secondary"
              aria-label="Previous Song"
            >
              <span className="material-symbols-outlined">skip_previous</span>
            </button>
            <button
              onClick={togglePlay}
              className={`control-btn ${isPlaying ? 'playing' : ''}`}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <span className="material-symbols-outlined">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <button
              onClick={playNext}
              className="control-btn secondary"
              aria-label="Next Song"
            >
              <span className="material-symbols-outlined">skip_next</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
