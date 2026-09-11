import CookieShape from './CookieShape';

export default function CookieDecorations() {
  return (
    /* Cluster of 3 interlocking themed "gears" directly next to the navigation pill.
       They are spaced so their outer boundaries touch exactly with 0px overlap, 
       completely eliminating any ghosting overlap highlights. */
    <div className="cookie-gears-container" style={{
      position: 'absolute',
      left: '520px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '580px',
      height: '320px',
      pointerEvents: 'none',
      opacity: 0.14,
      filter: 'saturate(0.25) brightness(1.15) contrast(0.95)', // Makes them extremely pastel and desaturated
    }}>
      {/* Gear 1: Large (Primary container, spins clockwise at 45s)
          Radius: 120px, Center X: 120px */}
      <div style={{
        position: 'absolute',
        top: '40px',
        left: '0px',
        animation: 'spin-clockwise 45s linear infinite',
        transformOrigin: 'center',
      }}>
        <CookieShape 
          size="240px" 
          fillColor="var(--md-primary-container)" 
          strokeColor="var(--md-primary)" 
        />
      </div>

      {/* Gear 2: Medium (Secondary container, spins counter-clockwise at 35s)
          Radius: 90px, Center X: 330px (120px + 120px + 90px = 330px. Touches Gear 1 perfectly!)
          Left = 330px - 90px = 240px */}
      <div style={{
        position: 'absolute',
        top: '70px',
        left: '240px',
        animation: 'spin-counter-clockwise 35s linear infinite',
        transformOrigin: 'center',
      }}>
        <CookieShape 
          size="180px" 
          fillColor="var(--md-secondary-container)" 
          strokeColor="var(--md-secondary)" 
        />
      </div>

      {/* Gear 3: Small (Tertiary container, spins clockwise at 50s)
          Radius: 70px, Center X: 490px (330px + 90px + 70px = 490px. Touches Gear 2 perfectly!)
          Left = 490px - 70px = 420px */}
      <div style={{
        position: 'absolute',
        top: '90px',
        left: '420px',
        animation: 'spin-clockwise 50s linear infinite',
        transformOrigin: 'center',
      }}>
        <CookieShape 
          size="140px" 
          fillColor="var(--md-tertiary-container)" 
          strokeColor="var(--md-tertiary)" 
        />
      </div>
    </div>
  );
}
