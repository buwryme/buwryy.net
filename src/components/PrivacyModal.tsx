import Modal from './Modal';

interface PrivacyModalProps {
  isOpen: boolean;
  isClosing?: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, isClosing = false, onClose }: PrivacyModalProps) {
  return (
    <Modal isOpen={isOpen} isClosing={isClosing} onClose={onClose} title="privacy">
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-primary)', marginTop: '2px' }}>verified_user</span>
        <p style={{ margin: 0 }}>
          this site doesn't collect data of any kind. not even including analytics, cookies, tracking or telemetry.
        </p>
      </div>
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-primary)', marginTop: '2px' }}>text_fields</span>
        <p style={{ margin: 0 }}>
          fonts load from google fonts.
        </p>
      </div>
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-primary)', marginTop: '2px' }}>music_note</span>
        <p style={{ margin: 0 }}>
          this website fetches song previews from Apple's iTunes API (30-second previews).
        </p>
      </div>
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-primary)', marginTop: '2px' }}>image</span>
        <p style={{ margin: 0 }}>
          icons and assets load from jsdelivr CDN (cdn.jsdelivr.net).
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-primary)', marginTop: '2px' }}>open_in_new</span>
        <p style={{ margin: 0 }}>
          if you click a link to social media you're leaving this site where their privacy rules apply.
        </p>
      </div>
    </Modal>
  );
}
