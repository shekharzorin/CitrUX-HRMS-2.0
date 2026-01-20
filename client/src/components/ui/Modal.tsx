import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icons';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    };

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div
                ref={modalRef}
                className={`
                    relative w-full ${sizeClasses[size]} 
                    bg-[var(--bg-surface)] rounded-2xl shadow-2xl 
                    border border-[var(--border-light)] 
                    animate-scale-up
                    flex flex-col max-h-[90vh]
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)]">
                        {title && <h3 className="text-lg font-bold text-[var(--text-main)]">{title}</h3>}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="p-1 rounded-full text-[var(--text-muted)] hover:bg-slate-100 hover:text-[var(--text-main)] transition-colors"
                            >
                                <Icon name="close" size={20} />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
