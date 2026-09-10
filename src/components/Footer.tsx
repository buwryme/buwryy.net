import { useState } from 'react';

export default function Footer({ onPrivacyClick, onAcknowledgementsClick }: { 
  onPrivacyClick: () => void;
  onAcknowledgementsClick: () => void;
}) {
  return (
    <footer style={{
      borderTop: '1px solid var(--md-outline-variant)',
      paddingTop: '24px',
      paddingBottom: '24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      marginTop: 'auto',
    }}>
      <span className="m3-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
        © {new Date().getFullYear()} buwryy.net
      </span>
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <button
          onClick={onPrivacyClick}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--md-outline)',
            fontFamily: "'Google Sans Flex', sans-serif",
            fontSize: '12px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 'var(--md-shape-small)',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--md-on-surface-variant)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--md-outline)'}
        >
          privacy
        </button>
        <span style={{ color: 'var(--md-outline)', fontSize: '12px' }}>·</span>
        <button
          onClick={onAcknowledgementsClick}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--md-outline)',
            fontFamily: "'Google Sans Flex', sans-serif",
            fontSize: '12px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 'var(--md-shape-small)',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--md-on-surface-variant)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--md-outline)'}
        >
          acknowledgements
        </button>
        <span style={{ color: 'var(--md-outline)', fontSize: '12px' }}>·</span>
        <span className="m3-label-medium" style={{ color: 'var(--md-outline)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          made with <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--md-primary)' }}>favorite</span>
        </span>
      </div>
      
      <p style={{
        fontSize: '11px',
        color: 'var(--md-outline)',
        textAlign: 'center',
        maxWidth: '500px',
        margin: 0,
        lineHeight: '1.5',
      }}>
        a personal site. redirects to external links are present!
      </p>
    </footer>
  );
}
