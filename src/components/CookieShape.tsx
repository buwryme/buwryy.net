import React from 'react';
import './CookieShape.css';

interface CookieShapeProps {
  size?: string;
  className?: string;
  children?: React.ReactNode;
}

const CookieShape: React.FC<CookieShapeProps> = ({ 
  size = '200px', 
  className = '',
  children 
}) => {
  // Generate a symmetric 12-point scalloped circle with rounder points
  const generateScallopedCirclePath = (points: number = 12, radius: number = 40, scallopDepth: number = 12) => {
    const centerX = 50;
    const centerY = 50;
    const angleStep = (2 * Math.PI) / points;
    
    let path = '';
    
    for (let i = 0; i < points; i++) {
      const angle1 = i * angleStep;
      const angle2 = (i + 0.5) * angleStep;
      const angle3 = (i + 1) * angleStep;
      
      // Point on the outer circle
      const x1 = centerX + radius * Math.cos(angle1);
      const y1 = centerY + radius * Math.sin(angle1);
      
      // Point for the scallop (inner point) - deeper for rounder appearance
      const x2 = centerX + (radius - scallopDepth) * Math.cos(angle2);
      const y2 = centerY + (radius - scallopDepth) * Math.sin(angle2);
      
      // Next point on the outer circle
      const x3 = centerX + radius * Math.cos(angle3);
      const y3 = centerY + radius * Math.sin(angle3);
      
      if (i === 0) {
        path += `M ${x1},${y1} `;
      }
      
      // Use cubic bezier curves for rounder scallops
      const cp1x = centerX + (radius - scallopDepth * 0.3) * Math.cos(angle1 + angleStep * 0.2);
      const cp1y = centerY + (radius - scallopDepth * 0.3) * Math.sin(angle1 + angleStep * 0.2);
      const cp2x = centerX + (radius - scallopDepth * 0.3) * Math.cos(angle3 - angleStep * 0.2);
      const cp2y = centerY + (radius - scallopDepth * 0.3) * Math.sin(angle3 - angleStep * 0.2);
      
      path += `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x3},${y3} `;
    }
    
    path += 'Z';
    return path;
  };

  const cookiePath = generateScallopedCirclePath(12, 40, 8);

  return (
    <div className={`cookie-shape-container ${className}`} style={{ width: size, height: size }}>
      <div className="cookie-shape-background">
        <svg viewBox="0 0 100 100" className="cookie-svg">
          <path d={cookiePath} />
        </svg>
      </div>
      {children && <div className="cookie-shape-content">{children}</div>}
    </div>
  );
};

export default CookieShape;
