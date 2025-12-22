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

    const getColors = () => {
        switch (type) {
            case 'danger': return { bg: '#FEF2F2', text: '#DC2626' };
            case 'warning': return { bg: '#FFFBEB', text: '#D97706' };
            case 'info': return { bg: '#EFF6FF', text: '#2563EB' };
            default: return { bg: '#FEF2F2', text: '#DC2626' };
        }
    };

    const colors = getColors();

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div
                className="animation-scale-up"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--bg-surface)',
                    padding: '2rem',
                    borderRadius: 'var(--radius-xl)',
                    width: '90%',
                    maxWidth: '400px',
                    boxShadow: 'var(--shadow-xl)',
                    textAlign: 'center',
                    border: '1px solid var(--border-color)'
                }}
            >
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: colors.bg,
                    color: colors.text,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    fontSize: '2rem'
                }}>
                    {getIcon()}
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', marginTop: 0 }}>
                    {title}
                </h3>

                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5, fontSize: '0.95rem' }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                        style={{
                            flex: 1,
                            justifyContent: 'center'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: colors.text,
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            boxShadow: 'var(--shadow-md)',
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
