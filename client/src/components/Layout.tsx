import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';
import { Button } from './ui/Button';
import { Icon, type IconName } from './ui/Icons';
import { NotificationBell } from './Header/NotificationBell';
import { ProfileDropdown } from './Header/ProfileDropdown';


const NavItem = ({ to, icon, label, precise = false, collapsed, isMobile, onCloseMobile }: { to: string; icon: IconName; label: string; precise?: boolean; collapsed: boolean; isMobile: boolean; onCloseMobile: () => void }) => {
    const location = useLocation();
    const isActive = precise ? location.pathname === to : location.pathname.startsWith(to);
    return (
        <Link to={to} className={`nav-link ${isActive ? 'active' : ''} ${collapsed && !isMobile ? 'justify-center px-2' : ''}`} onClick={onCloseMobile} title={collapsed ? label : ''}>
            <span className="flex-shrink-0"><Icon name={icon} size={20} /></span>
            {(!collapsed || isMobile) && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>}
        </Link>
    );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    // Company Settings
    const [companyName, setCompanyName] = useState(localStorage.getItem('company_name') || 'Citrux');
    const [companyLogo, setCompanyLogo] = useState(localStorage.getItem('company_logo') || '');

    useEffect(() => {
        const updateBranding = () => {
            const name = localStorage.getItem('company_name') || 'Citrux HS';
            const logo = localStorage.getItem('company_logo') || '';
            const favicon = localStorage.getItem('company_favicon');

            setCompanyName(name);
            setCompanyLogo(logo);
            document.title = name;

            if (favicon) {
                const link = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || document.createElement('link');
                link.type = 'image/x-icon';
                link.rel = 'shortcut icon';
                link.href = favicon;
                const head = document.getElementsByTagName('head')[0];
                if (!head.contains(link)) {
                    head.appendChild(link);
                }
            }
        };
        updateBranding();
        window.addEventListener('storage', updateBranding);
        window.addEventListener('branding-update', updateBranding);
        return () => {
            window.removeEventListener('storage', updateBranding);
            window.removeEventListener('branding-update', updateBranding);
        };
    }, []);

    const navigate = useNavigate();
    const location = useLocation();

    // Page Config
    const pageConfig: Record<string, { title: string; subtitle?: string; icon: IconName; gradient: string }> = {
        '/attendance': { title: 'Attendance', subtitle: 'Manage daily presence', icon: 'schedule', gradient: 'gradient-green' },
        '/leaves': { title: 'Leave Management', subtitle: 'Track and approve leaves', icon: 'event', gradient: 'gradient-purple' },
        '/timesheets': { title: 'Timesheets', subtitle: 'Track work hours', icon: 'timesheet', gradient: 'gradient-blue' },
        '/timesheets/approvals': { title: 'Timesheet Approvals', subtitle: 'Review team timesheets', icon: 'timesheet', gradient: 'gradient-orange' },
        '/payslips': { title: 'Payroll', subtitle: 'View payslips', icon: 'payroll', gradient: 'gradient-blue' },
        '/onboarding/submit': { title: 'Onboarding', subtitle: 'Join the team', icon: 'onboarding', gradient: 'gradient-purple' },
        '/settings': { title: 'Settings', subtitle: 'System configuration', icon: 'settings', gradient: 'gradient-purple' },
        '/users': { title: 'Employees', subtitle: 'Directory & Management', icon: 'employees', gradient: 'gradient-blue' },
        '/analytics': { title: 'Analytics', subtitle: 'HR Insights', icon: 'analytics', gradient: 'gradient-purple' },
        '/profile': { title: 'My Profile', subtitle: 'Personal information', icon: 'profile', gradient: 'gradient-orange' },
        '/recruitment/jobs': { title: 'Careers', subtitle: 'Open positions', icon: 'careers', gradient: 'gradient-blue' },
        '/expenses': { title: 'Expenses', subtitle: 'Reimbursements', icon: 'expenses', gradient: 'gradient-orange' }
    };

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setIsMobileMenuOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => {
        setIsMobileMenuOpen(false);
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        logout();
        navigate('/login');
    };

    const sidebarContent = (
        <div className="flex flex-col h-full bg-[var(--bg-sidebar)] text-[var(--sidebar-text)]">
            {/* Logo Area */}
            <div className={`
                flex items-center ${collapsed && !isMobile ? 'justify-center px-2' : 'px-6'} 
                h-[var(--header-height)] border-b border-[rgba(255,255,255,0.1)] transition-all duration-300
            `}>
                {companyLogo ? (
                    <img src={companyLogo} alt="Logo" className="max-h-8 w-auto object-contain" />
                ) : (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {companyName.charAt(0)}
                        </div>
                        {(!collapsed || isMobile) && <span className="font-bold text-white text-lg tracking-tight">{companyName}</span>}
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                {(!collapsed || isMobile) && <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-200/70">Main</div>}
                <NavItem to="/" icon="dashboard" label="Home" precise collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                {(user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER' || user?.role === 'EMPLOYEE') && (
                    <NavItem to="/users" icon="employees" label="My Team" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                )}
                <NavItem to="/profile" icon="profile" label="Me" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />

                <div className="my-4 border-t border-[rgba(255,255,255,0.05)]"></div>
                {(!collapsed || isMobile) && <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-200/70">Work</div>}
                <NavItem to="/attendance" icon="attendance" label="Time" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                <NavItem to="/leaves" icon="leaves" label="Leaves" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                <NavItem to="/expenses" icon="expenses" label="Expenses" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />

                {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                    <>
                        <div className="my-4 border-t border-[rgba(255,255,255,0.05)]"></div>
                        {(!collapsed || isMobile) && <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-200/70">Org</div>}
                        <NavItem to="/users" icon="employees" label="Employees" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                        <NavItem to="/analytics" icon="analytics" label="Analytics" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                        <NavItem to="/settings" icon="settings" label="Settings" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    </>
                )}
            </nav>

            {/* Collapse / User Mobile Footer */}
            {!isMobile && (
                <div className="p-4 border-t border-[rgba(255,255,255,0.1)] flex justify-end">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] text-[var(--sidebar-text)] transition-colors"
                        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        <Icon name={collapsed ? "chevron_right" : "chevron_left"} size={20} />
                    </button>
                </div>
            )}

            {isMobile && (
                <div className="p-4 border-t border-[rgba(255,255,255,0.1)]">
                    <Button variant="danger" onClick={handleLogout} className="w-full justify-center">
                        <Icon name="logout" size={18} />
                        Sign Out
                    </Button>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex bg-[var(--bg-body)] min-h-screen font-sans text-[var(--text-main)]">
            {/* Sidebar Desktop */}
            {!isMobile && (
                <aside
                    className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] 
                        ${collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width-expanded)]'}
                        bg-[var(--bg-sidebar)] border-r border-[var(--sidebar-border)] shadow-2xl`}
                >
                    {sidebarContent}
                </aside>
            )}

            {/* Mobile Sidebar */}
            {isMobile && (
                <>
                    {/* Overlay */}
                    <div
                        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    {/* Sidebar Drawer */}
                    <aside
                        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-[var(--bg-sidebar)] transition-transform duration-300 shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
                    >
                        {sidebarContent}
                    </aside>
                </>
            )}

            {/* Main Content Area */}
            <div
                className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] 
                    ${!isMobile ? (collapsed ? 'ml-[var(--sidebar-width-collapsed)]' : 'ml-[var(--sidebar-width-expanded)]') : ''}`}
            >
                {/* Modern Header */}
                <header className="sticky top-0 z-30 h-[var(--header-height)] bg-[var(--bg-surface)]/80 backdrop-blur-md border-b border-[var(--border-color)] flex items-center justify-between px-6 shadow-sm">
                    {/* Left: Check page config or default */}
                    <div className="flex items-center gap-4">
                        {isMobile && (
                            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" title="Open Menu">
                                <Icon name="menu" size={24} />
                            </button>
                        )}

                        {/* Dynamic Page Header (Breadcrumb style) */}
                        <div className="hidden md:flex flex-col">
                            <h2 className="text-lg font-bold text-[var(--text-main)] tracking-tight">
                                {pageConfig[location.pathname]?.title || 'Dashboard'}
                            </h2>
                            {pageConfig[location.pathname]?.subtitle && (
                                <span className="text-xs text-[var(--text-muted)]">{pageConfig[location.pathname]?.subtitle}</span>
                            )}
                        </div>
                        {/* Fallback for unknown routes or mobile */}
                        <div className="md:hidden">
                            <h2 className="text-lg font-bold text-[var(--text-main)]">{companyName}</h2>
                        </div>
                    </div>

                    {/* Center: Global Search (Desktop) */}
                    {!isMobile && (
                        <div className="flex-1 max-w-md mx-6">
                            <div className="relative group">
                                <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search employees, leaves, policies..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-none rounded-lg text-sm text-[var(--text-main)] placeholder-slate-400 
                                    ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-[var(--primary)] focus:bg-white dark:focus:bg-slate-800 transition-all outline-none"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                                    <span className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700">CTRL</span>
                                    <span className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700">K</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Right: Actions */}
                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button className="header-icon-button" title="Announcements">
                            <Icon name="campaign" size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-slate-900"></span>
                        </button>
                        <NotificationBell />
                        <div className="h-8 w-[1px] bg-[var(--border-light)] mx-2 sm:mx-4"></div>
                        <ProfileDropdown onLogoutRequest={handleLogout} />
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 p-6 md:p-8 overflow-y-auto overflow-x-hidden">
                    {/* Optional: Add a top gradient fade */}
                    <div className="max-w-[1600px] mx-auto animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>

            <ConfirmModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={confirmLogout}
                title="Sign Out"
                message="Are you sure you want to sign out?"
                confirmText="Logout"
                type="danger"
            />
        </div>
    );
};

export default Layout;
