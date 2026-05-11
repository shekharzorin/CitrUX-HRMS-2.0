import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';
import { Button } from './ui/Button';
import { Icon, type AppIconName } from './ui/Icons';
import { NotificationBell } from './Header/NotificationBell';
import { ProfileDropdown } from './Header/ProfileDropdown';
import { api } from '../services/api';
import { AiAssistant } from './AiAssistant';
import { resolveImageUrl } from '../utils/image';


const NavItem = ({ to, icon, label, precise = false, collapsed, isMobile, onCloseMobile }: { to: string; icon: AppIconName; label: string; precise?: boolean; collapsed: boolean; isMobile: boolean; onCloseMobile: () => void }) => {
    const location = useLocation();
    const isActive = precise ? location.pathname === to : location.pathname.startsWith(to);
    return (
        <Link
            to={to}
            className={`
                flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 font-medium text-sm
                ${isActive
                    ? 'bg-[var(--primary)] text-white shadow-sm font-bold'
                    : 'text-[var(--sidebar-text)] hover:bg-slate-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'}
                ${collapsed && !isMobile ? 'justify-center px-0' : ''}
            `}
            onClick={onCloseMobile}
            title={collapsed ? label : ''}
        >
            <span className={`flex-shrink-0 ${isActive ? 'text-white' : ''}`}><Icon name={icon} size={22} /></span>
            {(!collapsed || isMobile) && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>}
        </Link>
    );
};

/* ... Component imports ... */

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    /* ... state ... */
    const { user, logout } = useAuth();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchDropdownRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    // Dynamic Branding
    const companyName = user?.company?.name || 'Citrux HRMS';
    const companyLogo = user?.company?.logoUrl || '';
    const companySlogan = user?.company?.slogan || 'Citrux SaaS';

    useEffect(() => {
        document.title = companyName;
    }, [companyName]);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === 'Escape') {
                setShowSearchDropdown(false);
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node) && !searchInputRef.current?.contains(e.target as Node)) {
                setShowSearchDropdown(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                setShowSearchDropdown(true);
                try {
                    const results = await api.get<any[]>(`/search?q=${searchQuery}`);
                    setSearchResults(results);
                } catch (err) {
                    console.error("Search failed", err);
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowSearchDropdown(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleResultClick = (link: string) => {
        navigate(link);
        setShowSearchDropdown(false);
        setSearchQuery('');
    };

    // Page Config
    const pageConfig: Record<string, { title: string; subtitle?: string; icon: AppIconName; gradient: string }> = {
        /* ... same config ... */
        '/attendance': { title: 'Attendance', subtitle: 'Manage daily presence', icon: 'schedule', gradient: 'gradient-green' },
        '/leaves': { title: 'Leave Management', subtitle: 'Track and approve leaves', icon: 'event', gradient: 'gradient-purple' },
        '/timesheets': { title: 'Timesheets', subtitle: 'Track work hours', icon: 'timesheet', gradient: 'gradient-blue' },
        '/timesheets/approvals': { title: 'Timesheet Approvals', subtitle: 'Review team timesheets', icon: 'timesheet', gradient: 'gradient-orange' },
        '/worklogs': { title: 'Work Log', subtitle: 'Daily hours & activity', icon: 'timesheet', gradient: 'gradient-blue' },
        '/tasks': { title: 'My Tasks', subtitle: 'Personal task board', icon: 'approvals', gradient: 'gradient-purple' },
        '/payslips': { title: 'Payroll', subtitle: 'View payslips', icon: 'payroll', gradient: 'gradient-blue' },
        '/onboarding/submit': { title: 'Onboarding', subtitle: 'Join the team', icon: 'onboarding', gradient: 'gradient-purple' },
        '/settings': { title: 'Settings', subtitle: 'System configuration', icon: 'settings', gradient: 'gradient-purple' },
        '/users': { title: 'Employees', subtitle: 'Directory & Management', icon: 'employees', gradient: 'gradient-blue' },
        '/analytics': { title: 'Analytics', subtitle: 'HR Insights', icon: 'analytics', gradient: 'gradient-purple' },
        '/profile': { title: 'My Profile', subtitle: 'Personal information', icon: 'profile', gradient: 'gradient-orange' },
        '/recruitment/jobs': { title: 'Careers', subtitle: 'Open positions', icon: 'careers', gradient: 'gradient-blue' },
        '/expenses': { title: 'Expenses', subtitle: 'Reimbursements', icon: 'expenses', gradient: 'gradient-orange' },
        '/super-admin/companies': { title: 'Global Companies', subtitle: 'Manage tenants', icon: 'departments', gradient: 'gradient-purple' }
    };

    useEffect(() => {
        /* ... existing resize effect ... */
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
        <div className="flex flex-col h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-light)]">
            {/* Logo Area - Clean & Minimal */}
            <div className={`
                flex items-center justify-between ${collapsed && !isMobile ? 'px-2 flex-col justify-center gap-2' : 'px-6'} 
                h-24 transition-all duration-300 border-b border-[var(--border-light)] mb-2 relative group
            `}>
                <div className={`flex items-center gap-3 overflow-hidden w-full ${collapsed && !isMobile ? 'justify-center' : ''}`}>
                    {companyLogo ? (
                        <img src={resolveImageUrl(companyLogo)} alt="Logo" className="max-h-10 w-auto object-contain flex-shrink-0" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200 dark:shadow-none flex-shrink-0">
                            {companyName.charAt(0)}
                        </div>
                    )}
                    {(!collapsed || isMobile) && (
                        <div className="flex flex-col overflow-hidden flex-1 transition-opacity duration-300">
                            <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight truncate">{companyName}</span>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">{companySlogan}</span>
                        </div>
                    )}
                </div>
                {!isMobile && (
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={`p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-[var(--primary)] transition-colors flex-shrink-0 ${collapsed ? 'mt-1' : ''}`}
                        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        <Icon name={collapsed ? "chevron_right" : "chevron_left"} size={20} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-2 space-y-1 custom-scrollbar">
                <NavItem to="/" icon="dashboard" label="Dashboard" precise collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />

                {(user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER' || user?.role === 'EMPLOYEE') && (
                    <NavItem to="/users" icon="employees" label="Employees" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                )}

                <NavItem to="/attendance" icon="attendance" label="Time & Attendance" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                <NavItem to="/leaves" icon="leaves" label="Leaves" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                <NavItem to="/worklogs" icon="timesheet" label="Work Log" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                <NavItem to="/tasks" icon="approvals" label="My Tasks" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />

                {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                    <NavItem to="/admin/payroll" icon="payroll" label="Payroll Manager" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                )}

                <NavItem to="/expenses" icon="expenses" label="Expenses" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                <NavItem to="/analytics" icon="analytics" label="Reports" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />

                {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                    <NavItem to="/admin/system-health" icon="settings" label="System Health" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                )}

                {user?.role === 'SUPER_ADMIN' && (
                    <NavItem to="/super-admin/companies" icon="departments" label="Global Companies" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                )}

                <div className="my-6 mx-6 border-t border-slate-100"></div>

                {(user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'SUPER_ADMIN') && (
                    <NavItem to="/settings" icon="settings" label="Settings" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                )}
                <NavItem to="/profile" icon="profile" label="My Profile" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
            </nav>

            {/* User Mobile Footer */}

            {isMobile && (
                <div className="p-6 border-t border-slate-100">
                    <Button variant="danger" onClick={handleLogout} className="w-full justify-center rounded-xl">
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
                    className={`sticky top-0 h-screen z-40 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex-shrink-0
                        ${collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'}
                        bg-[var(--bg-sidebar)] border-r border-[var(--sidebar-border)] shadow-xl overflow-hidden`}
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
            <div className="flex-1 flex flex-col min-h-screen transition-all duration-300 min-w-0">
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
                            <h2 className="text-base font-bold text-[var(--text-main)] truncate max-w-[150px]">{companyName}</h2>
                        </div>
                    </div>

                    {/* Center: Global Search (Desktop) */}
                    {/* Center: Global Search (Desktop) */}
                    {!isMobile && (
                        <div className="flex-1 max-w-md mx-6">
                            <div className="relative group flex items-center">
                                <div className="absolute left-3.5 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none flex items-center justify-center">
                                    <Icon name="search" size={20} />
                                </div>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search employees, leaves, policies..."
                                    className="w-full h-10 pl-11 pr-14 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl text-sm font-medium text-[var(--text-main)] placeholder-slate-400 
                                    ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-[var(--primary)] focus:bg-white dark:focus:bg-slate-800 transition-all outline-none shadow-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => searchQuery.length >= 2 && setShowSearchDropdown(true)}
                                />
                                <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
                                    {isSearching ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                                    ) : (
                                        <>
                                            <kbd className="hidden sm:inline-flex items-center h-5 px-1.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md shadow-sm">CTRL</kbd>
                                            <kbd className="hidden sm:inline-flex items-center h-5 px-1.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md shadow-sm">K</kbd>
                                        </>
                                    )}
                                </div>

                                {/* Search Results Dropdown */}
                                {showSearchDropdown && (
                                    <div 
                                        ref={searchDropdownRef}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-scale-up"
                                    >
                                        <div className="p-2 max-h-[400px] overflow-y-auto">
                                            {searchResults.length > 0 ? (
                                                searchResults.map((result) => (
                                                    <button
                                                        key={`${result.type}-${result.id}`}
                                                        onClick={() => handleResultClick(result.link)}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors text-left group"
                                                    >
                                                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                                                            <Icon name={result.icon as AppIconName} size={20} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-bold text-[var(--text-main)] truncate">{result.title}</div>
                                                            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">{result.subtitle}</div>
                                                        </div>
                                                        <div className="text-slate-300">
                                                            <Icon name="chevron_right" size={16} />
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center">
                                                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                                        <Icon name="search" size={24} />
                                                    </div>
                                                    <p className="text-sm font-medium text-[var(--text-main)]">No results for "{searchQuery}"</p>
                                                    <p className="text-xs text-[var(--text-muted)] mt-1">Try searching for employees or tasks</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="flex items-center justify-center h-10 w-10">
                            <NotificationBell />
                        </div>

                        <div className="h-8 w-[1px] bg-[var(--border-light)] mx-2"></div>
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
            
            <AiAssistant />
        </div>
    );
};

export default Layout;
