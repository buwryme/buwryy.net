interface ToastProps {
  message: string;
  isVisible: boolean;
  isClosing: boolean;
  toastKey: string;
}

export default function Toast({ message, isVisible, isClosing, toastKey }: ToastProps) {
  if (!isVisible && !isClosing) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 2000,
        pointerEvents: 'none',
      }}
    >
      <div
        key={toastKey}
        className={`m3-toast ${isClosing ? 'toast-closing' : 'toast-opening'}`}
        style={{
          background: 'var(--md-inverse-surface)',
          color: 'var(--md-inverse-on-surface)',
          padding: '14px 24px',
          borderRadius: 'var(--md-shape-small)',
          boxShadow: 'var(--md-elevation-3)',
          fontFamily: "'Google Sans Flex', sans-serif",
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        {message}
      </div>
    </div>
  );
}
