import React, { createContext, useContext, useState, useCallback } from 'react';
import { Icon } from '../components/ui/Icons';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-white/10 backdrop-blur-md min-w-[300px] animate-slide-up
                            ${toast.type === 'success' ? 'bg-emerald-600 text-white' : ''}
                            ${toast.type === 'error' ? 'bg-rose-600 text-white' : ''}
                            ${toast.type === 'warning' ? 'bg-amber-500 text-white' : ''}
                            ${toast.type === 'info' ? 'bg-slate-800 text-white' : ''}
                        `}
                    >
                        <div className="flex-shrink-0">
                            {toast.type === 'success' && <Icon name="check_circle" size={20} />}
                            {toast.type === 'error' && <Icon name="warning" size={20} />}
                            {toast.type === 'warning' && <Icon name="warning" size={20} />}
                            {toast.type === 'info' && <Icon name="info" size={20} />}
                        </div>
                        <p className="text-sm font-medium flex-1">{toast.message}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                            title="Close"
                        >
                            <Icon name="close" size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
