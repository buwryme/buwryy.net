import { useLayoutEffect, useRef, type CSSProperties } from 'react';

interface RainbowWordProps {
    text: string;
    className?: string;
    letterClassName?: string;
    letterStyle?: (index: number) => CSSProperties;
}

/** Splits the word so each letter carries its own slice of one continuous gradient. Chrome drops the clipped background when a single clipped box wraps inline-block letters. */
export default function RainbowWord({
    text,
    className = '',
    letterClassName = '',
    letterStyle,
}: RainbowWordProps) {
    const wordRef = useRef<HTMLSpanElement>(null);
    const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);

    useLayoutEffect(() => {
        const word = wordRef.current;
        if (!word) return;

        const measure = () => {
            const width = word.offsetWidth;
            if (!width) return;
            word.style.setProperty('--word-w', `${width}px`);
            letterRefs.current.forEach((letter) => {
                if (!letter) return;
                letter.style.setProperty('--letter-x', `${letter.offsetLeft}px`);
            });
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(word);
        window.addEventListener('resize', measure);
        document.fonts?.ready.then(measure).catch(() => { /* fallback metrics are still usable */ });

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [text]);

    return (
        <span ref={wordRef} className={`rainbow-word ${className}`.trim()} aria-label={text}>
            {text.split('').map((char, index) => (
                <span
                    key={`${char}-${index}`}
                    ref={(node) => { letterRefs.current[index] = node; }}
                    className={`rainbow-letter ${letterClassName}`.trim()}
                    style={letterStyle?.(index)}
                >
                    {char}
                </span>
            ))}
        </span>
    );
}
