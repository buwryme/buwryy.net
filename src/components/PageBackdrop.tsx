import CookieShape from './CookieShape';
import './PageBackdrop.css';

interface PageBackdropProps {
    cookieSize?: number;
}

// the home page's background treatment (soft blobs + a slowly spinning
// cookie) as a reusable layer for secondary pages.
export default function PageBackdrop({ cookieSize = 460 }: PageBackdropProps)
{
    return (
        <div className="page-backdrop" aria-hidden="true">
            <div className="page-backdrop-cookie">
                <CookieShape
                    size={`${cookieSize}px`}
                    fillColor="var(--md-primary-container)"
                    strokeColor="var(--md-primary)"
                />
            </div>
            <div className="page-backdrop-cookie reverse" style={{ width: `${Math.round(cookieSize * 0.72)}px`, height: `${Math.round(cookieSize * 0.72)}px` }}>
                <CookieShape
                    size={`${Math.round(cookieSize * 0.72)}px`}
                    fillColor="var(--md-primary-container)"
                    strokeColor="var(--md-primary)"
                />
            </div>
            <div className="page-backdrop-blob blob-1" />
            <div className="page-backdrop-blob blob-2" />
            <div className="page-backdrop-blob blob-3" />
        </div>
    );
}
