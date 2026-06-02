import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';
import { Icon, type AppIconName } from './ui/Icons';
import { NotificationBell } from './Header/NotificationBell';
import { ProfileDropdown } from './Header/ProfileDropdown';
import { api } from '../services/api';
import { AiAssistant } from './AiAssistant';
import { resolveImageUrl } from '../utils/image';
import { AppShell } from '../design-system/components/Layout/AppShell';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarFooter,
} from '../design-system/components/Layout/Sidebar';
import { Topbar, TopbarLeft, TopbarRight } from '../design-system/components/Layout/Topbar';

const NavItem = ({ to, icon, label, precise = false, collapsed, isMobile, onCloseMobile }: { to: string; icon: AppIconName; label: string; precise?: boolean; collapsed: boolean; isMobile: boolean; onCloseMobile: () => void }) => {
    const location = useLocation();
    const isActive = precise ? location.pathname === to : location.pathname.startsWith(to);
    return (
        <Link
            to={to}
            className={`nav-link ${isActive ? 'active' : ''} ${collapsed && !isMobile ? 'justify-center px-0 mx-2' : 'mx-3'}`}
            onClick={onCloseMobile}
            title={collapsed ? label : ''}
        >
            <span className="flex-shrink-0"><Icon name={icon} size={18} /></span>
            {(!collapsed || isMobile) && <span className="truncate">{label}</span>}
        </Link>
    );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout, hasPermission, hasFeature } = useAuth();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchDropdownRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    const companyName = user?.company?.name || 'Citrux';
    const companyLogo = user?.company?.logoUrl || '';
    const companyFavicon = user?.company?.faviconUrl || '';
    const companySlogan = user?.company?.slogan || 'HRMS';

    useEffect(() => {
        document.title = companyName;
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon && companyFavicon) {
            (favicon as HTMLLinkElement).href = resolveImageUrl(companyFavicon);
        }
    }, [companyName, companyFavicon]);

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

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setShowSearchDropdown(true);
                try {
                    const results = await api.get<any[]>(`/search?q=${searchQuery}`);
                    setSearchResults(results);
                } catch (err) {
                    console.error("Search failed", err);
                    setSearchResults([]);
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

    const pageConfig: Record<string, { title: string; subtitle?: string }> = {
        '/': { title: 'Dashboard', subtitle: 'Overview of your workspace' },
        '/attendance': { title: 'Attendance', subtitle: 'Daily presence tracking' },
        '/leaves': { title: 'Leaves', subtitle: 'Leave requests & balances' },
        '/worklogs': { title: 'Work Log', subtitle: 'Daily activities' },
        '/tasks': { title: 'Tasks', subtitle: 'Project management' },
        '/engagement': { title: 'Engagement', subtitle: 'Culture & Appraisals' },
        '/users': { title: 'Employees', subtitle: 'Organization directory' },
        '/payslips': { title: 'Payroll', subtitle: 'Salary & benefits' },
        '/expenses': { title: 'Expenses', subtitle: 'Claims & reimbursements' },
        '/analytics': { title: 'Insights', subtitle: 'Data & reports' },
        '/settings': { title: 'Settings', subtitle: 'System preferences' },
        '/profile': { title: 'Profile', subtitle: 'Personal details' }
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

    const AppSidebar = (
        <Sidebar collapsed={collapsed} className={isMobile ? 'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ' + (isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : 'sticky top-0'}>
            <SidebarHeader className={collapsed && !isMobile ? 'justify-center' : ''}>
                {companyLogo ? (
                    <img src={resolveImageUrl(companyLogo)} alt="Logo" className="h-7 w-auto object-contain" />
                ) : (
                    <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                        {companyName.charAt(0)}
                    </div>
                )}
                {(!collapsed || isMobile) && (
                    <div className="ml-3 flex flex-col min-w-0">
                        <span className="font-bold text-sm text-slate-900 dark:text-white leading-none truncate">{companyName}</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">{companySlogan}</span>
                    </div>
                )}
            </SidebarHeader>

            <SidebarContent>
                <NavItem to="/" icon="dashboard" label="Dashboard" precise collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                <SidebarGroup title={(!collapsed || isMobile) ? "Workspace" : ""}>
                    <NavItem to="/users" icon="employees" label="Employees" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/org-chart" icon="org_chart" label="Org Chart" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/attendance" icon="attendance" label="Attendance" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/leaves" icon="leaves" label="Leaves" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/worklogs" icon="timesheet" label="Work Log" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/tasks" icon="approvals" label="Tasks" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/engagement" icon="celebration" label="Engagement" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/performance" icon="performance" label="Performance" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/recruitment/jobs" icon="ats" label="Recruitment" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/assets" icon="assets" label="Assets" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/documents" icon="file_text" label="Documents" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    {hasFeature('SUPPORT_DESK') && (
                        <NavItem to="/support" icon="approvals" label="Support" precise collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    )}
                </SidebarGroup>
                
                <SidebarGroup title={(!collapsed || isMobile) ? "Finance" : ""}>
                    <NavItem to="/expenses" icon="expenses" label="Expenses" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/payslips" icon="payroll" label="My Payslips" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    {hasPermission('MANAGE_PAYROLL') && (
                        <NavItem to="/admin/payroll" icon="payroll" label="Run Payroll" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    )}
                </SidebarGroup>
                
                <SidebarGroup title={(!collapsed || isMobile) ? "Management" : ""}>
                    <NavItem to="/analytics" icon="analytics" label="Insights" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    <NavItem to="/settings" icon="settings" label="Settings" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    {hasPermission('MANAGE_ROLES') && (
                        <NavItem to="/admin/roles" icon="employees" label="Roles & Permissions" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    )}
                    {hasPermission('VIEW_SYSTEM_HEALTH') && (
                        <NavItem to="/admin/system-health" icon="bolt" label="System Health" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    )}
                    {hasFeature('SUPPORT_DESK') && hasPermission('VIEW_ALL_TICKETS') && (
                        <NavItem to="/support/console" icon="approvals" label="Support Console" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    )}
                </SidebarGroup>

                {user?.role === 'SUPER_ADMIN' && (
                    <SidebarGroup title={(!collapsed || isMobile) ? "Super Admin" : ""}>
                        <NavItem to="/super-admin/companies" icon="departments" label="Global Companies" collapsed={collapsed} isMobile={isMobile} onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter>
                <button 
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <Icon name={collapsed ? "chevron_right" : "chevron_left"} size={18} />
                    {!collapsed && <span className="text-sm font-medium">Collapse</span>}
                </button>
            </SidebarFooter>
        </Sidebar>
    );

    const AppTopbar = (
        <Topbar>
            <TopbarLeft>
                {isMobile && (
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)} 
                        aria-label="Open mobile menu"
                        className="p-2 -ml-2 text-slate-400 hover:text-primary transition-colors"
                    >
                        <Icon name="menu" size={22} />
                    </button>
                )}
                <div className="flex flex-col">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {pageConfig[location.pathname]?.title || 'Dashboard'}
                    </h2>
                    <p className="text-[10px] text-slate-500 font-medium">
                        {pageConfig[location.pathname]?.subtitle || companyName}
                    </p>
                </div>
            </TopbarLeft>

            <TopbarRight className="flex-1 justify-end max-w-full">
                {!isMobile && (
                    <div className="flex-1 max-w-sm mx-4">
                        <div className="relative group">
                            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search (Ctrl + K)"
                                className="w-full h-9 pl-10 pr-4 bg-slate-100 dark:bg-slate-800 border-none rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => searchQuery.length >= 2 && setShowSearchDropdown(true)}
                            />
                            {showSearchDropdown && (
                                <div ref={searchDropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
                                    <div className="p-2 max-h-80 overflow-y-auto">
                                        {searchResults.length > 0 ? (
                                            searchResults.map((result) => (
                                                <button 
                                                    key={`${result.type}-${result.id}`} 
                                                    onClick={() => handleResultClick(result.link)} 
                                                    className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors text-left group"
                                                >
                                                    <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                        <Icon name={result.icon as AppIconName} size={16} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{result.title}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{result.subtitle}</div>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-xs text-slate-500">No results for "{searchQuery}"</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-4">
                    <NotificationBell />
                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />
                    <ProfileDropdown onLogoutRequest={handleLogout} />
                </div>
            </TopbarRight>
        </Topbar>
    );

    return (
        <>
            {isMobile && (
                <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)} />
            )}
            
            <AppShell sidebar={AppSidebar} topbar={AppTopbar}>
                {children}
            </AppShell>

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
        </>
    );
};

export default Layout;
