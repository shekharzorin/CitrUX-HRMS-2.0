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
                className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50 cursor-pointer border-none"
                style={{ backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Theme Settings"
            >
                <span style={{ fontSize: '1.5rem' }}>🎨</span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="bg-surface p-6 rounded-xl shadow-xl max-w-sm w-full relative animation-scale-up"
                style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: '320px', border: '1px solid var(--border-color)' }}>

                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 text-muted hover:text-main cursor-pointer bg-transparent border-none"
                    style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '1.2rem', color: 'var(--text-muted)' }}
                >
                    ✕
                </button>

                <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Theme Settings</h3>
                <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>Customize your workspace appearance.</p>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 500 }}>Mode</label>
                    <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-body)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                        <button
                            onClick={() => theme === 'dark' && toggleTheme()}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: 'none',
                                borderRadius: '4px',
                                background: theme === 'light' ? 'var(--bg-surface)' : 'transparent',
                                color: theme === 'light' ? 'var(--text-main)' : 'var(--text-muted)',
                                boxShadow: theme === 'light' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            ☀️ Light
                        </button>
                        <button
                            onClick={() => theme === 'light' && toggleTheme()}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: 'none',
                                borderRadius: '4px',
                                background: theme === 'dark' ? 'var(--bg-surface)' : 'transparent',
                                color: theme === 'dark' ? 'var(--text-main)' : 'var(--text-muted)',
                                boxShadow: theme === 'dark' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            🌙 Dark
                        </button>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 500 }}>Primary Color</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
                        {colors.map((c) => (
                            <button
                                key={c}
                                onClick={() => setPrimaryColor(c)}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: c,
                                    border: primaryColor === c ? '2px solid var(--text-main)' : '2px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    padding: 0
                                }}
                                title={c}
                            />
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                        Changes are saved automatically to your device.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ThemeSettings;
