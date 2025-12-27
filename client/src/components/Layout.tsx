import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

import ConfirmModal from './ConfirmModal';
import { Button } from './ui/Button';
import { Icon } from './ui/Icons';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, primaryColor, setPrimaryColor } = useTheme();

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Page Title Mapping
    const pageTitles: Record<string, string> = {
        '/': 'Dashboard',
        '/attendance': 'Attendance Overview',
        '/leaves': 'Leave Management',
        '/payslips': 'Payroll & Payslips',
        '/onboarding/submit': 'Onboarding',
        '/settings': 'System Settings',
        '/users': 'Employee Directory',
        '/analytics': 'Analytics & Reports',
        '/profile': 'My Profile'
    };

    const getPageTitle = () => {
        const path = location.pathname;
        // Handle exact matches first
        if (pageTitles[path]) return pageTitles[path];

        // Handle nested routes (simple fallback)
        if (path.startsWith('/onboarding')) return 'Onboarding';
        if (path.startsWith('/users')) return 'Employee Directory';

        return 'Citrux HRMS'; // Fallback
    };

    const colors = [
        '#9d316e', // Default Citrux
        '#2563eb', // Blue
        '#16a34a', // Green
        '#d97706', // Amber
        '#9333ea', // Purple
        '#020617', // Slate
    ];

    // Handle Window Resize
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setIsMobileMenuOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getInitials = () => {
        if (!user) return '?';
        const firstName = user.profile?.firstName || '';
        const lastName = user.profile?.lastName || '';
        if (firstName && lastName) {
            return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
        }
        return (user.profile?.firstName?.charAt(0) || user.email[0]).toUpperCase();
    };

    const renderAvatar = (size: string = '32px', fontSize: string = '0.75rem') => {
        const photo = user?.profile?.profilePhoto;
        const settings = typeof user?.profile?.profilePhotoSettings === 'string'
            ? JSON.parse(user.profile.profilePhotoSettings)
            : user?.profile?.profilePhotoSettings;

        if (photo) {
            let transform = `scale(${settings?.zoom || 1}) translate(${settings?.x || 0}%, ${settings?.y || 0}%)`;

            if (settings?.croppedAreaPixels) {
                const { x, y, width } = settings.croppedAreaPixels;
                const scale = 100 / width;
                transform = `scale(${scale}) translate(${-x}px, ${-y}px)`;
            }

            return (
                <div className="avatar-container avatar-container-dynamic">
                    <img
                        src={photo}
                        alt="Avatar"
                        className="avatar-img"
                        id={`avatar-img-${size}`}
                    />
                    <style>{`
                        .avatar-container-dynamic {
                            width: ${size};
                            height: ${size};
                        }
                        .avatar-img { 
                            transform: ${transform}; 
                        }
                    `}</style>
                </div>
            );
        }

        return (
            <div className="avatar-placeholder avatar-placeholder-dynamic">
                <style>{`
                    .avatar-placeholder-dynamic {
                        width: ${size};
                        height: ${size};
                        font-size: ${fontSize};
                    }
                `}</style>
                {getInitials()}
            </div>
        );
    };

    const handleLogout = () => {
        setIsProfileDropdownOpen(false);
        setIsMobileMenuOpen(false);
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sidebarContent = (
        <>
            <div className={`
                ${collapsed ? 'sidebar-content-collapsed' : 'sidebar-content-expanded'} 
                ${!isMobile ? 'border-b border-[var(--border-color)]' : ''}
                sidebar-content-wrapper
            `}>
                <div className="sidebar-header">
                    <div className="logo-box">C</div>
                    {(!collapsed || isMobile) && (
                        <h2 className="logo-text">Citrux</h2>
                    )}
                </div>
                {!isMobile && (
                    <button onClick={() => setCollapsed(!collapsed)} className="collapse-btn" title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
                        <Icon name={collapsed ? "chevron_right" : "chevron_left"} size={20} />
                    </button>
                )}
                {isMobile && (
                    <button onClick={() => setIsMobileMenuOpen(false)} className="mobile-close-btn" title="Close Menu">
                        <Icon name="close" size={24} />
                    </button>
                )}
            </div>

            <nav className={`nav-container ${collapsed && !isMobile ? 'nav-collapsed' : 'nav-expanded'}`}>
                {(!collapsed || isMobile) && <p className="nav-section-title">Main Menu</p>}

                <Link to="/" className="nav-link" onClick={() => isMobile && setIsMobileMenuOpen(false)}>
                    <Icon name="dashboard" size={20} />
                    {(!collapsed || isMobile) && <span>Dashboard</span>}
                </Link>
                <Link to="/attendance" className="nav-link" onClick={() => isMobile && setIsMobileMenuOpen(false)}>
                    <Icon name="attendance" size={20} />
                    {(!collapsed || isMobile) && <span>Attendance</span>}
                </Link>
                <Link to="/leaves" className="nav-link" onClick={() => isMobile && setIsMobileMenuOpen(false)}>
                    <Icon name="leaves" size={20} />
                    {(!collapsed || isMobile) && <span>Leaves</span>}
                </Link>
                <Link to="/payslips" className="nav-link" onClick={() => isMobile && setIsMobileMenuOpen(false)}>
                    <Icon name="payroll" size={20} />
                    {(!collapsed || isMobile) && <span>Payroll</span>}
                </Link>
                <Link to="/onboarding/submit" className="nav-link" onClick={() => isMobile && setIsMobileMenuOpen(false)}>
                    <Icon name="onboarding" size={20} />
                    {(!collapsed || isMobile) && <span>Onboarding</span>}
                </Link>

                {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                    <>
                        <div className="nav-divider"></div>
                        {(!collapsed || isMobile) && <p className="nav-section-title">Administration</p>}

                        <Link to="/settings" className="nav-link" onClick={() => isMobile && setIsMobileMenuOpen(false)}>
                            <Icon name="settings" size={20} />
                            {(!collapsed || isMobile) && <span>Settings</span>}
                        </Link>
                        <Link to="/users" className="nav-link" onClick={() => isMobile && setIsMobileMenuOpen(false)}>
                            <Icon name="employees" size={20} />
                            {(!collapsed || isMobile) && <span>Employees</span>}
                        </Link>
                        <Link to="/analytics" className="nav-link" onClick={() => isMobile && setIsMobileMenuOpen(false)}>
                            <Icon name="analytics" size={20} />
                            {(!collapsed || isMobile) && <span>Analytics</span>}
                        </Link>
                    </>
                )}
            </nav>

            {isMobile && (
                <div className={collapsed && !isMobile ? "user-info-box-collapsed" : "user-info-box"}>
                    <div className={collapsed && !isMobile ? "user-info-header-center" : "user-info-header"}>
                        {renderAvatar('40px', '0.9rem')}
                        {(!collapsed || isMobile) && (
                            <div className="user-details">
                                <div className="user-name">{user?.profile?.firstName || 'User'}</div>
                                <div className="user-role">{user?.role}</div>
                            </div>
                        )}
                    </div>
                    <Button
                        variant="danger"
                        onClick={handleLogout}
                        className={(collapsed && !isMobile) ? "nav-logout-btn-collapsed" : "nav-logout-btn"}
                        title="Sign Out"
                    >
                        {(collapsed && !isMobile) ? <Icon name="logout" size={20} /> : "Sign Out"}
                    </Button>
                </div>
            )}
        </>
    );

    return (
        <div className="main-content-wrapper">
            {/* Sidebar Desktop */}
            {!isMobile && (
                <aside className={`sidebar-transition desktop-sidebar ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
                    {sidebarContent}
                </aside>
            )}

            {/* Mobile Menu Overlay */}
            {isMobile && isMobileMenuOpen && (
                <>
                    <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)} />
                    <aside className="mobile-sidebar-container">
                        {sidebarContent}
                    </aside>
                </>
            )}

            {/* Mobile Header */}
            {isMobile && (
                <div className="mobile-header">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="mobile-menu-btn" title="Open Menu">
                        <Icon name="menu" size={24} />
                    </button>
                    <h2 className="mobile-logo-text">Citrux</h2>
                    {renderAvatar('36px', '0.8rem')}
                </div>
            )}

            {/* Main Content */}
            <div className={`content-transition main-content ${isMobile ? 'content-mobile' : 'content-desktop'} ${!isMobile && (collapsed ? 'content-collapsed' : 'content-expanded')}`}>
                {/* Desktop Header */}
                {!isMobile && (
                    <header className="desktop-header">
                        <h2 className="page-title">
                            {getPageTitle()}
                        </h2>
                        <div className="flex items-center gap-8">
                            <div className="relative" ref={dropdownRef}>
                                <div
                                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                    className="profile-dropdown-trigger"
                                >
                                    {renderAvatar('36px', '0.8rem')}
                                    <div className="flex flex-col">
                                        <span className="text-[0.95rem] font-semibold text-[var(--text-main)] leading-tight">{user?.profile?.firstName || 'User'}</span>
                                        <span className="text-xs text-[var(--text-muted)]">{user?.role}</span>
                                    </div>
                                    <Icon name="arrow_down" size={14} className="text-[var(--text-muted)]" />
                                </div>

                                {isProfileDropdownOpen && (
                                    <div className="glass-card absolute right-0 mt-3 w-80 p-2 animate-fade-in profile-dropdown-menu">
                                        <div className="p-4 border-b flex flex-col items-center text-center profile-dropdown-header">
                                            <div className="mb-4">{renderAvatar('64px', '1.5rem')}</div>
                                            <h3 className="profile-dropdown-name">{user?.profile?.firstName} {user?.profile?.lastName}</h3>
                                            <p className="profile-dropdown-email">{user?.email}</p>
                                        </div>

                                        <div className="p-4 border-b border-[var(--border-color)]">
                                            <p className="nav-section-title pl-0">Theme Settings</p>
                                            <div className="theme-toggle-container">
                                                <button onClick={() => theme === 'dark' && toggleTheme()} className={`theme-toggle-btn ${theme === 'light' ? 'theme-toggle-active' : 'theme-toggle-inactive'}`}>Light</button>
                                                <button onClick={() => theme === 'light' && toggleTheme()} className={`theme-toggle-btn ${theme === 'dark' ? 'theme-toggle-active' : 'theme-toggle-inactive'}`}>Dark</button>
                                            </div>
                                            <div className="flex flex-wrap gap-2.5">
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
                                                            className={`color-btn ${getColorClass(c)} ${primaryColor === c ? 'color-btn-selected' : ''}`}
                                                            title={`Set color ${c}`}
                                                        ></button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="p-2">
                                            <Link to="/profile" className="nav-link" onClick={() => setIsProfileDropdownOpen(false)}>
                                                <Icon name="profile" size={18} /> Profile
                                            </Link>
                                            <button onClick={handleLogout} className="nav-link w-full border-none bg-transparent text-[var(--error)]" title="Sign Out">
                                                <Icon name="logout" size={18} /> Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>
                )}

                <main className={`main-scroll-area ${isMobile ? 'main-scroll-padding-mobile' : 'main-scroll-padding-desktop'}`}>
                    {children}
                </main>
            </div>

            <ConfirmModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={confirmLogout}
                title="Confirm Logout"
                message="Are you sure you want to log out?"
                confirmText="Logout"
                type="danger"
            />
        </div>
    );
};

export default Layout;
