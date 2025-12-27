import React, { useEffect } from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'warning';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger'
}) => {
    // Esc key handling
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return '⚠️';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '⚠️';
        }
    };


    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="animation-scale-up confirm-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`modal-icon-wrapper modal-icon-${type}`}>
                    {getIcon()}
                </div>

                <h3 className="confirm-modal-title">
                    {title}
                </h3>

                <p className="confirm-modal-message">
                    {message}
                </p>

                <div className="confirm-modal-actions">
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                        style={{ flex: 1, justifyContent: 'center' }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`confirm-btn confirm-btn-${type}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
