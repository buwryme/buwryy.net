import { useEffect, useRef } from 'react';

interface Flake {
    x: number;
    y: number;
    r: number;
    speed: number;
    drift: number;
    phase: number;
    alpha: number;
}

export default function SnowOverlay() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let width = 0;
        let height = 0;
        let flakes: Flake[] = [];
        let frame = 0;

        const makeSnow = () => {
            const count = Math.min(90, Math.max(18, Math.round((width * height) / 30000)));
            flakes = Array.from({ length: count }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                r: 0.7 + Math.random() * 1.1,
                speed: 0.12 + Math.random() * 0.38,
                drift: (Math.random() - 0.5) * 0.18,
                phase: Math.random() * Math.PI * 2,
                alpha: 0.25 + Math.random() * 0.35,
            }));
        };

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
            makeSnow();
        };

        const draw = (now = 0) => {
            context.clearRect(0, 0, width, height);
            const dark = document.documentElement.getAttribute('data-theme') === 'dark';
            context.fillStyle = dark ? '#ffffff' : '#5a5a5a';

            for (const flake of flakes) {
                context.globalAlpha = flake.alpha * (dark ? 0.9 : 0.55);
                context.beginPath();
                context.arc(
                    flake.x + Math.sin(now / 2200 + flake.phase) * 5,
                    flake.y,
                    flake.r,
                    0,
                    Math.PI * 2,
                );
                context.fill();

                if (!reduced) {
                    flake.y += flake.speed;
                    flake.x += flake.drift;
                    if (flake.y > height + 6) {
                        flake.y = -6;
                        flake.x = Math.random() * width;
                    }
                    if (flake.x < -6) flake.x = width + 6;
                    if (flake.x > width + 6) flake.x = -6;
                }
            }

            context.globalAlpha = 1;
            if (!reduced) frame = window.requestAnimationFrame(draw);
        };

        resize();
        draw();

        const onResize = () => {
            resize();
            if (reduced) draw();
        };

        window.addEventListener('resize', onResize);
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    return <canvas ref={canvasRef} className="snow-overlay" aria-hidden="true" />;
}
