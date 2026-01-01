import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../ui/Icons';
import { Avatar } from '../ui/Avatar';

interface ProfileDropdownProps {
    onLogoutRequest?: () => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onLogoutRequest }) => {
    const { user } = useAuth();
    const { theme, toggleTheme, primaryColor, setPrimaryColor } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const colors = [
        '#9d316e', // Default Citrux
        '#2563eb', // Blue
        '#16a34a', // Green
        '#d97706', // Amber
        '#9333ea', // Purple
        '#020617', // Slate
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="profile-dropdown-container" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="profile-trigger"
            >
                <Avatar size="36px" fontSize="0.8rem" />
                <div className="flex flex-col hidden md:flex">
                    <span className="text-[0.95rem] font-semibold text-[var(--text-main)] leading-tight">{user?.profile?.firstName || 'User'}</span>
                    <span className="text-xs text-[var(--text-muted)]">{user?.role}</span>
                </div>
                <Icon name="arrow_down" size={14} className="text-[var(--text-muted)] hidden md:block" />
            </div>

            {isOpen && (
                <div className="profile-dropdown">
                    <div className="profile-header-section">
                        <div className="profile-avatar-large">
                            <Avatar size="72px" fontSize="1.75rem" />
                        </div>
                        <h3 className="profile-name">{user?.profile?.firstName} {user?.profile?.lastName}</h3>
                        <p className="profile-email">{user?.email}</p>
                    </div>

                    <div className="profile-theme-section">
                        <div className="mb-2">
                            <p className="profile-section-title">Theme Settings</p>
                            <p className="profile-section-subtitle">Applies to your account only</p>
                        </div>
                        <div className="theme-toggle-buttons">
                            <button
                                onClick={() => theme === 'dark' && toggleTheme()}
                                className={`theme-toggle-btn ${theme === 'light' ? 'theme-toggle-btn-active' : ''}`}
                            >
                                Light
                            </button>
                            <button
                                onClick={() => theme === 'light' && toggleTheme()}
                                className={`theme-toggle-btn ${theme === 'dark' ? 'theme-toggle-btn-active' : ''}`}
                            >
                                Dark
                            </button>
                        </div>
                        <div className="color-picker-grid">
                            {colors.map((c) => {
                                const getColorClass = (color: string) => {
                                    const map: Record<string, string> = {
                                        '#9d316e': 'theme-citrux',
                                        '#2563eb': 'theme-blue',
                                        '#16a34a': 'theme-green',
                                        '#d97706': 'theme-amber',
                                        '#9333ea': 'theme-purple',
                                        '#020617': 'theme-slate',
                                    };
                                    return map[color] || '';
                                };

                                return (
                                    <button
                                        key={c}
                                        onClick={() => setPrimaryColor(c)}
                                        className={`color-btn ${getColorClass(c)} ${primaryColor === c ? 'color-btn-selected ring-2 ring-offset-2 ring-blue-500' : ''} w-6 h-6 rounded-full transition-transform hover:scale-110`}
                                        title={`Set color ${c}`}
                                        aria-label={`Set accent color to ${c}`}
                                    ></button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="profile-actions-section">
                        <Link to="/profile" className="profile-link" onClick={() => setIsOpen(false)}>
                            <Icon name="profile" size={18} /> <span>Profile</span>
                        </Link>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                if (onLogoutRequest) onLogoutRequest();
                            }}
                            className="profile-logout-btn"
                            title="Sign Out"
                        >
                            <Icon name="logout" size={18} /> <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
