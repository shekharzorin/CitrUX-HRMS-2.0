import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';
type PrimaryColor = '#9d316e' | '#2563eb' | '#16a34a' | '#d97706' | '#9333ea' | string;

interface ThemeContextType {
    theme: ThemeMode;
    toggleTheme: () => void;
    setTheme: (theme: ThemeMode) => void;
    primaryColor: PrimaryColor;
    setPrimaryColor: (color: PrimaryColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Default to light if not stored
    const [theme, setThemeState] = useState<ThemeMode>(() => {
        const stored = localStorage.getItem('theme-mode');
        return (stored as ThemeMode) || 'light';
    });

    const [primaryColor, setPrimaryColorState] = useState<PrimaryColor>(() => {
        const stored = localStorage.getItem('theme-primary');
        return stored || '#9d316e'; // Default Keka-ish color
    });

    useEffect(() => {
        const root = document.documentElement;

        // Apply dark mode class
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Apply primary color variable
        root.style.setProperty('--primary', primaryColor);

        // Calculate hover variant (simple darkening)
        // This is a naive implementation, ideally we'd use color manipulation lib
        // but for now let's just let CSS calc handle it or rely on existing vars if logical
        // Actually, let's keep it simple: we update --primary. 
        // We might need to update --primary-hover too.

        localStorage.setItem('theme-mode', theme);
        localStorage.setItem('theme-primary', primaryColor);

    }, [theme, primaryColor]);

    const setTheme = (mode: ThemeMode) => {
        setThemeState(mode);
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const setPrimaryColor = (color: PrimaryColor) => {
        setPrimaryColorState(color);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, primaryColor, setPrimaryColor }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
