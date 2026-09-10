import Modal from './Modal';

interface AcknowledgementsModalProps {
  isOpen: boolean;
  isClosing?: boolean;
  onClose: () => void;
}

export default function AcknowledgementsModal({ isOpen, isClosing = false, onClose }: AcknowledgementsModalProps) {
  return (
    <Modal isOpen={isOpen} isClosing={isClosing} onClose={onClose} title="acknowledgements">
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-primary)', marginTop: '2px' }}>palette</span>
        <p style={{ margin: 0 }}>
          this site uses a design heavily inspired by <strong>Google's Material Design 3</strong>.
        </p>
      </div>
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-primary)', marginTop: '2px' }}>code</span>
        <p style={{ margin: 0 }}>
          the tiktok patcher was reverse engineered from editing news and made open source by me.
        </p>
      </div>
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-primary)', marginTop: '2px' }}>music_note</span>
        <p style={{ margin: 0 }}>
          this website fetches song previews from Apple's iTunes API (30-second previews).
        </p>
      </div>
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-outline)', marginTop: '2px' }}>info</span>
        <p style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
          this website is not affiliated with or endorsed by Google.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-primary)', marginTop: '2px' }}>favorite</span>
        <p style={{ margin: 0 }}>
          special thanks to the open source community and everyone who inspired this project.
        </p>
      </div>
    </Modal>
  );
}
