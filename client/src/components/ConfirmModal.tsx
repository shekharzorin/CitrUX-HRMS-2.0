import React, { useEffect } from 'react';
import { Icon } from './ui/Icons';
import { Button } from './ui/Button';

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
            case 'danger': return 'delete';
            case 'warning': return 'campaign';
            case 'info': return 'check_circle';
            default: return 'campaign';
        }
    };

    const getTypeColor = () => {
        switch (type) {
            case 'danger': return 'bg-red-50 text-red-600 border-red-100';
            case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'info': return 'bg-blue-50 text-blue-600 border-blue-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };


    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="animation-scale-up confirm-modal-content bg-[var(--bg-surface)] rounded-[32px] p-8 shadow-2xl border border-[var(--border-color)] max-w-sm w-full text-center"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border shadow-inner ${getTypeColor()}`}>
                    <Icon name={getIcon() as any} size={32} />
                </div>

                <h3 className="confirm-modal-title">
                    {title}
                </h3>

                <p className="confirm-modal-message">
                    {message}
                </p>

                <div className="flex gap-4 mt-8">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1 h-12 rounded-xl"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={type === 'danger' ? 'danger' : 'primary'}
                        onClick={() => { onConfirm(); onClose(); }}
                        className="flex-1 h-12 rounded-xl shadow-lg"
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
