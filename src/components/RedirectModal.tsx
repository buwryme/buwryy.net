import { useEffect, useState } from 'react';
import Modal from './Modal';

interface RedirectModalProps {
    isOpen: boolean;
    onClose: () => void;
    destination: string;
    url: string;
}

export default function RedirectModal({ isOpen, onClose, destination, url }: RedirectModalProps)
{
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (isOpen) setClosing(false);
    }, [isOpen]);

    const close = () => {
        setClosing(true);
        window.setTimeout(() => {
            setClosing(false);
            onClose();
        }, 200);
    };

    const go = () => {
        window.open(url, '_blank', 'noopener,noreferrer');
        close();
    };

    return (
        <Modal
            isOpen={isOpen}
            isClosing={closing}
            onClose={close}
            title={`this action will redirect you to ${destination}.`}
            titleIcon={
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--md-error)' }}>
                    warning
                </span>
            }
            actions={
                <>
                    <button
                        type="button"
                        className="m3-btn-outlined"
                        onClick={close}
                        style={{ borderColor: 'var(--md-primary)' }}
                    >
                        cancel
                    </button>
                    <button type="button" className="m3-btn-filled" onClick={go}>yes, take me there!!</button>
                </>
            }
        >
            <p style={{ margin: 0 }}>
                you are going to be redirected to <code>{url}</code>. are you sure?
            </p>
        </Modal>
    );
}
