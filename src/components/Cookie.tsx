import { COOKIE_PATH, COOKIE_SEVEN_PATH } from '../lib/cookiePath';
import './Cookie.css';

interface CookieProps {
    size?: number;
    spin?: boolean;
    lobes?: 7 | 12;
    className?: string;
}

// the small inline cookie marker, used where the full CookieShape would be
// overkill (list bullets, badges). inherits currentColor.
export default function Cookie({ size = 18, spin = true, lobes = 12, className = '' }: CookieProps)
{
    const path = lobes === 7 ? COOKIE_SEVEN_PATH : COOKIE_PATH;

    return (
        <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            className={`site-cookie${spin ? ' is-spinning' : ''} ${className}`.trim()}
            aria-hidden="true"
        >
            <path d={path} fill="currentColor" />
        </svg>
    );
}
