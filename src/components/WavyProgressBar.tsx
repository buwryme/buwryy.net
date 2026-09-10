import { useEffect, useRef, useState } from 'react';

interface WavyProgressBarProps {
  progress: number; // 0 to 1
  duration: number;
  currentTime: number;
  isPlaying: boolean;
}

export default function WavyProgressBar({ progress, duration, currentTime, isPlaying }: WavyProgressBarProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const progressPathRef = useRef<SVGPathElement>(null);
  const bgPathRef = useRef<SVGPathElement>(null);
  const [waveOffset, setWaveOffset] = useState(0);

  // Smooth wave animation using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      setWaveOffset(0);
      return;
    }

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Move waves horizontally at a much slower rate with large modulo to prevent noticeable reset
      setWaveOffset(prev => (prev + deltaTime * 0.005) % 10000);

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!svgRef.current || !progressPathRef.current || !bgPathRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 12;
    const centerY = height / 2;
    
    // Wave parameters
    const waveFrequency = isPlaying ? 0.15 : 0;
    const amplitude = isPlaying ? 2 : 0;

    // Generate wavy path for played portion with offset for movement
    let progressPathData = `M 0 ${centerY}`;
    const playedWidth = width * progress;
    const gap = 8; // Gap between progress and background
    
    for (let x = 0; x <= playedWidth; x += 1) {
      const y = centerY + Math.sin((x + waveOffset) * waveFrequency) * amplitude;
      progressPathData += ` L ${x} ${y}`;
    }

    // Generate straight line for background (starts after progress with gap)
    const bgStartX = playedWidth + gap;
    let bgPathData = `M ${bgStartX} ${centerY} L ${width} ${centerY}`;

    progressPathRef.current.setAttribute('d', progressPathData);
    bgPathRef.current.setAttribute('d', bgPathData);
  }, [progress, isPlaying, waveOffset]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ width: '100%', marginTop: '12px' }}>
      <div className="wavy-progress">
        <svg 
          ref={svgRef} 
          width="100%" 
          height="12"
          style={{ overflow: 'visible' }}
        >
          {/* Background line (straight) */}
          <path 
            ref={bgPathRef}
            fill="none"
            stroke="var(--md-surface-variant)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Progress line (wavy when playing, straight when paused) */}
          <path 
            ref={progressPathRef}
            fill="none"
            stroke="var(--md-primary)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        fontSize: '12px', 
        color: 'var(--md-on-surface-variant)',
        marginTop: '4px',
      }}>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
