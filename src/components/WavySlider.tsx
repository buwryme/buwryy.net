import { useCallback, useEffect, useRef, useState } from 'react';
import './WavySlider.css';

/* material 3 expressive slider, wavy variant, XS size.

   handle, gap and track-shape values are the generated AndroidX slider
   tokens (compose/material3 SliderTokens, v2_3_5). track math is lifted
   from Slider.kt verbatim: the active segment ends one gap short of the
   handle, the inactive segment resumes one gap past it, which is what
   produces the 4dp track / 2dp inside corner on the handle-facing ends.

   TRACK_HEIGHT is the deliberate exception to the token list. the 16dp
   ActiveTrackHeight belongs to the plain slider; android's media seek bar
   uses the wavy *progress indicator* geometry, a thin stroke. 4dp is both
   the Compose linear-progress stroke and the waveThickness default in
   mahozad/wavy-slider, which targets android 13 media controls. the wave
   on a 16dp track reads as a fat blob rather than a springy coil.

   the inactive track uses surface-container-highest instead of Compose's
   secondary-container. both are documented slider tokens — this one is
   MDC-Android's app:trackColorInactive default, and surfaceVariant was
   the pre-refresh m3 role — but this site's light scheme puts
   secondary-container a single step from surface-container-high, which
   renders the inactive track invisible. swap the two fill values if the
   light scheme is ever regenerated with a usable secondary-container.

   the 4dp stop indicator is omitted on purpose: Compose paints it in
   secondary-container on top of a secondary-container inactive track, so
   it is a no-op there. */

const TRACK_HEIGHT = 4;
const HANDLE_WIDTH = 4;
const HANDLE_WIDTH_PRESSED = 2;
const HANDLE_HEIGHT = 44;
const HANDLE_GAP = 6;
const CORNER_OUTER = 2; // = TRACK_HEIGHT / 2, i.e. CornerFull for a 4dp track
const CORNER_INNER = 2;

const WAVE_AMPLITUDE = 3;
const WAVELENGTH = 24;
const WAVE_SPEED = WAVELENGTH; // one wavelength per second, matching Compose
const PRESS_GROWTH = 1.2;
const MAX_AMPLITUDE = 6.6; // stops a held wave from clipping the 44dp row

// MDC's waveAmplitudeRampProgressMin/Max: the wave flattens at both ends
// rather than starting or finishing on a crest.
const RAMP_IN = 0.1;
const RAMP_OUT = 0.9;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** smoothstepped amplitude envelope, zero at both extremes. */
function progressEnvelope(progress: number): number {
  const inRamp = clamp(progress / RAMP_IN, 0, 1);
  const outRamp = clamp((1 - progress) / (1 - RAMP_OUT), 0, 1);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return smooth(inRamp) * smooth(outRamp);
}

interface WavySliderProps {
  /** Track position, 0..1. */
  value: number;
  onChange: (value: number) => void;
  /** While true the wave travels (i.e. media is playing). */
  active?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  /** Formats the value for screen readers, e.g. "0:12 of 0:30". */
  describeValue?: (value: number) => string;
  onScrubStart?: () => void;
  onScrubEnd?: (value: number) => void;
}

export default function WavySlider({
  value,
  onChange,
  active = false,
  disabled = false,
  ariaLabel,
  describeValue,
  onScrubStart,
  onScrubEnd,
}: WavySliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pressed, setPressed] = useState(false);
  // mirrors pressed for the pointer handlers. reading it from the render
  // closure is unsafe here: a fast tap fires pointerdown and pointerup in
  // one task, before React re-renders, so pointerup would see a stale
  // false, bail, and strand the control in its pressed state.
  const pressedRef = useRef(false);
  const [pressAmp, setPressAmp] = useState(0);

  // free-running accumulator rather than a function of playback position:
  // deriving phase from currentTime makes wave speed depend on where you
  // are in the track and freezes the wave whenever playback stalls.
  const phaseRef = useRef(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  // travel halts when neither playing nor held, so a paused player does
  // not burn a rAF loop.
  useEffect(() => {
    if (!active && !pressed) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      phaseRef.current += dt * WAVE_SPEED;
      setPhase(phaseRef.current % WAVELENGTH);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, pressed]);

  // expressive press interaction: amplitude grows while held, relaxes on
  // release.
  useEffect(() => {
    const from = pressed ? 0 : 1;
    const to = pressed ? 1 : 0;
    const start = performance.now();
    const duration = 400;
    let raf = 0;
    const tick = (now: number) => {
      const t = clamp((now - start) / duration, 0, 1);
      setPressAmp(from + (to - from) * t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pressed]);

  const fraction = clamp(value, 0, 1);
  const handleX = fraction * width;

  const activeEnd = handleX - HANDLE_GAP;
  const inactiveStart = activeEnd + HANDLE_GAP * 2;

  const amplitude = Math.min(
    MAX_AMPLITUDE,
    WAVE_AMPLITUDE * progressEnvelope(fraction) * (1 + PRESS_GROWTH * pressAmp),
  );

  // stroked rather than filled: a round cap on a TRACK_HEIGHT stroke *is*
  // the CornerFull leading end for free. the clip supplies the trailing
  // end, which a round cap would otherwise bulge a half-track past the
  // handle instead of ending on the 2dp inside corner.
  const wavePath = (() => {
    if (width <= 0 || activeEnd <= 0) return '';
    const cy = HANDLE_HEIGHT / 2;
    const step = 1;
    const points: string[] = [];
    for (let x = 0; x <= activeEnd; x += step) {
      const y = cy + amplitude * Math.sin((2 * Math.PI * (x - phase)) / WAVELENGTH);
      points.push(`${x.toFixed(1)} ${y.toFixed(2)}`);
    }
    points.push(`${activeEnd.toFixed(1)} ${(cy + amplitude * Math.sin((2 * Math.PI * (activeEnd - phase)) / WAVELENGTH)).toFixed(2)}`);
    return `M ${points.join(' L ')}`;
  })();

  // hand-built path because a rect with rx would round both ends; the
  // handle-facing end needs the 2dp inside corner, the far end the
  // CORNER_OUTER one.
  const inactivePath = (() => {
    if (width <= 0 || inactiveStart >= width) return '';
    const top = HANDLE_HEIGHT / 2 - TRACK_HEIGHT / 2;
    const bottom = HANDLE_HEIGHT / 2 + TRACK_HEIGHT / 2;
    const right = width;
    const x0 = Math.max(0, inactiveStart);
    const rOut = CORNER_OUTER;
    const rIn = Math.min(CORNER_INNER, (right - x0) / 2);
    return [
      `M ${x0 + rIn} ${top}`,
      `H ${right - rOut}`,
      `A ${rOut} ${rOut} 0 0 1 ${right} ${top + rOut}`,
      `V ${bottom - rOut}`,
      `A ${rOut} ${rOut} 0 0 1 ${right - rOut} ${bottom}`,
      `H ${x0 + rIn}`,
      `A ${rIn} ${rIn} 0 0 1 ${x0} ${bottom - rIn}`,
      `V ${top + rIn}`,
      `A ${rIn} ${rIn} 0 0 1 ${x0 + rIn} ${top}`,
      'Z',
    ].join(' ');
  })();

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || el.clientWidth === 0) return 0;
      const rect = el.getBoundingClientRect();
      return clamp((clientX - rect.left) / rect.width, 0, 1);
    },
    [],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pressedRef.current = true;
    setPressed(true);
    onScrubStart?.();
    onChange(valueFromClientX(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pressedRef.current || disabled) return;
    onChange(valueFromClientX(e.clientX));
  };

  const finishScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pressedRef.current) return;
    const next = valueFromClientX(e.clientX);
    pressedRef.current = false;
    setPressed(false);
    onChange(next);
    onScrubEnd?.(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const step = e.shiftKey ? 0.1 : 1 / 60;
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = clamp(fraction + step, 0, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = clamp(fraction - step, 0, 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(next);
    onScrubEnd?.(next);
  };

  const handleWidth = pressed ? HANDLE_WIDTH_PRESSED : HANDLE_WIDTH;

  return (
    <div
      ref={trackRef}
      className={`wavy-slider ${pressed ? 'is-pressed' : ''} ${disabled ? 'is-disabled' : ''}`}
      // the handle sets the row height, matching android's slider where
      // the handle is the tallest element.
      style={{ height: HANDLE_HEIGHT }}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
      aria-valuetext={describeValue?.(fraction)}
      aria-disabled={disabled || undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishScrub}
      onPointerCancel={finishScrub}
      onKeyDown={handleKeyDown}
    >
      {width > 0 && (
        <svg
          className="wavy-slider-svg"
          // viewBox is sized to the measured pixel width so one user unit
          // is one css pixel. a stretched viewBox (the old
          // preserveAspectRatio="none" approach) distorts the wavelength
          // and amplitude by different factors, which is what made the
          // wave read as the wrong shape entirely.
          viewBox={`0 0 ${width} ${HANDLE_HEIGHT}`}
          width={width}
          height={HANDLE_HEIGHT}
        >
          <defs>
            <clipPath id="wavy-slider-active-clip">
              <rect x="0" y="0" width={Math.max(0, activeEnd)} height={HANDLE_HEIGHT} />
            </clipPath>
          </defs>

          {inactivePath && (
            <path
              d={inactivePath}
              className="wavy-slider-inactive"
              fill="var(--md-surface-container-highest)"
            />
          )}

          <g clipPath="url(#wavy-slider-active-clip)">
            {wavePath && (
              <path
                d={wavePath}
                className="wavy-slider-active"
                fill="none"
                stroke="var(--md-primary)"
                strokeWidth={TRACK_HEIGHT}
                strokeLinecap="round"
              />
            )}
          </g>

          <rect
            x={handleX - handleWidth / 2}
            y={0}
            width={handleWidth}
            height={HANDLE_HEIGHT}
            rx={handleWidth / 2}
            className="wavy-slider-handle"
            fill="var(--md-primary)"
          />
        </svg>
      )}
    </div>
  );
}
