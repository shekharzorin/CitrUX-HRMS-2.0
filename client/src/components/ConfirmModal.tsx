import React from 'react';
import { Icon } from './ui/Icons';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

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
            case 'danger': return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30';
            case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30';
            case 'info': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30';
            default: return 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
            <div className="text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border shadow-sm ${getTypeColor()}`}>
                    <Icon name={getIcon() as any} size={28} />
                </div>

                <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">
                    {title}
                </h3>

                <p className="text-[var(--text-muted)] text-sm mb-6">
                    {message}
                </p>

                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={type === 'danger' ? 'danger' : 'primary'}
                        onClick={() => { onConfirm(); onClose(); }}
                        className="flex-1"
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmModal;
