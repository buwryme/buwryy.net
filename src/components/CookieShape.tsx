import React from 'react';
import './CookieShape.css';
import { COOKIE_PATH } from '../lib/cookiePath';

interface CookieShapeProps {
  size?: string;
  className?: string;
  children?: React.ReactNode;
  fillColor?: string;
  strokeColor?: string;
}

const CookieShape: React.FC<CookieShapeProps> = ({ 
  size = '200px', 
  className = '',
  fillColor,
  strokeColor,
  children 
}) => {
  const cookiePath = COOKIE_PATH;

  return (
    <div className={`cookie-shape-container ${className}`} style={{ width: size, height: size }}>
      <div className="cookie-shape-background">
        <svg viewBox="0 0 100 100" className="cookie-svg">
          <path 
            d={cookiePath} 
            style={{ 
              fill: fillColor, 
              stroke: strokeColor 
            }} 
          />
        </svg>
      </div>
      {children && <div className="cookie-shape-content">{children}</div>}
    </div>
  );
};

export default CookieShape;
