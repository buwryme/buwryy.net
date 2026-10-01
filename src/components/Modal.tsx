import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  isClosing?: boolean;
  onClose: () => void;
  title: string;
  titleIcon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ isOpen, isClosing = false, onClose, title, titleIcon, children, actions, maxWidth = '560px' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={`m3-dialog-overlay ${isClosing ? 'modal-closing' : 'modal-opening'}`}
      onClick={onClose}
    >
      <div
        className={`m3-dialog ${isClosing ? 'dialog-closing' : 'dialog-opening'}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth }}
      >
        <h2 className="m3-dialog-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {titleIcon}
          {title}
        </h2>
        <div className="m3-dialog-content">
          {children}
        </div>
        <div className="m3-dialog-actions">
          {actions || (
            <button className="m3-btn-tonal" onClick={onClose}>
              close
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
