import React from 'react';
import './CookieShape.css';

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
  // Generate a mathematically perfect 12-point scalloped "cookie" circle (cosine-modulated circle)
  const generateScallopedCirclePath = () => {
    const centerX = 50;
    const centerY = 50;
    const totalSteps = 120; // 120 steps for an incredibly smooth path
    let path = '';
    
    for (let i = 0; i <= totalSteps; i++) {
      const angle = (i * 2 * Math.PI) / totalSteps;
      // Base radius of 41 modulated by a gentler 12-period cosine wave with 2.8 amplitude for incredibly soft, shallow scallops
      const r = 41 + 2.8 * Math.cos(12 * angle);
      const x = centerX + r * Math.cos(angle - Math.PI / 2);
      const y = centerY + r * Math.sin(angle - Math.PI / 2);
      
      if (i === 0) {
        path += `M ${x.toFixed(3)},${y.toFixed(3)}`;
      } else {
        path += ` L ${x.toFixed(3)},${y.toFixed(3)}`;
      }
    }
    
    path += ' Z';
    return path;
  };

  const cookiePath = generateScallopedCirclePath();

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
