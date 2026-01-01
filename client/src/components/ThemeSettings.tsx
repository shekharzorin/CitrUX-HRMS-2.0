import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSettings: React.FC = () => {
    const { theme, toggleTheme, primaryColor, setPrimaryColor } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const colors = [
        '#9d316e', // Default Keka
        '#2563eb', // Blue
        '#16a34a', // Green
        '#d97706', // Amber
        '#9333ea', // Purple
        '#000000', // Black
    ];

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[var(--primary)] text-white shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer border-none"
                title="Theme Settings"
            >
                <span className="text-2xl">🎨</span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--bg-surface)] p-8 rounded-[32px] shadow-2xl max-w-[320px] w-full relative border border-[var(--border-color)] animate-scale-up">
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-6 right-6 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer bg-transparent border-none text-xl"
                >
                    ✕
                </button>

                <h3 className="mt-0 text-[var(--text-main)] font-black text-xl mb-1">Theme Settings</h3>
                <p className="mb-8 text-sm text-[var(--text-muted)] font-medium">Customize your workspace appearance.</p>

                <div className="mb-8">
                    <label className="block mb-3 text-[var(--text-main)] font-bold text-xs uppercase tracking-wider">Interface Mode</label>
                    <div className="flex gap-2 bg-[var(--bg-body)] p-1.5 rounded-2xl border border-[var(--border-color)]">
                        <button
                            onClick={() => theme === 'dark' && toggleTheme()}
                            className={`flex-1 py-3 px-4 border-none rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${theme === 'light'
                                ? 'bg-[var(--bg-surface)] text-[var(--primary)] shadow-sm'
                                : 'bg-transparent text-[var(--text-muted)]'
                                }`}
                        >
                            ☀️ Light
                        </button>
                        <button
                            onClick={() => theme === 'light' && toggleTheme()}
                            className={`flex-1 py-3 px-4 border-none rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${theme === 'dark'
                                ? 'bg-[var(--bg-surface)] text-[var(--primary)] shadow-sm'
                                : 'bg-transparent text-[var(--text-muted)]'
                                }`}
                        >
                            🌙 Dark
                        </button>
                    </div>
                </div>

                <div className="mb-2">
                    <label className="block mb-3 text-[var(--text-main)] font-bold text-xs uppercase tracking-wider">Primary Accent</label>
                    <div className="grid grid-cols-6 gap-3">
                        {colors.map((c) => (
                            <button
                                key={c}
                                onClick={() => setPrimaryColor(c)}
                                className={`w-8 h-8 rounded-full cursor-pointer transition-all hover:scale-125 border-2 p-0 ${primaryColor === c ? 'border-[var(--text-main)]' : 'border-transparent'
                                    }`}
                                ref={(el: HTMLButtonElement | null) => { if (el) el.style.backgroundColor = c; }}
                                title={c}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-[var(--border-color)]">
                    <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-widest text-center">
                        Preferences saved locally
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ThemeSettings;
