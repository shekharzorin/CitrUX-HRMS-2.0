import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';


import ConfirmModal from './ConfirmModal';
import { Button } from './ui/Button';
import { Icon } from './ui/Icons';
import { NotificationBell } from './Header/NotificationBell';
import { ProfileDropdown } from './Header/ProfileDropdown';
import { Avatar } from './ui/Avatar';



import { PageHeader } from './ui/PageHeader';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();


    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    // Company Settings State
    const [companyName, setCompanyName] = useState(localStorage.getItem('company_name') || 'Citrux');
    const [companyLogo, setCompanyLogo] = useState(localStorage.getItem('company_logo') || '');

    // Listen for setting updates
    useEffect(() => {
        const handleStorageChange = () => {
            setCompanyName(localStorage.getItem('company_name') || 'Citrux');
            setCompanyLogo(localStorage.getItem('company_logo') || '');
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const navigate = useNavigate();
    const location = useLocation();

    // Enhanced Page Config for Hero Header
    const pageConfig: Record<string, { title: string; subtitle?: string; icon: any; gradient: string }> = {
        '/attendance': { title: 'Attendance Tracking', subtitle: 'View and manage employee daily presence', icon: 'schedule', gradient: 'gradient-green' },
        '/leaves': { title: 'Leave Management', subtitle: 'Submit and approve leave requests', icon: 'event', gradient: 'gradient-purple' },
        '/timesheets': { title: 'Time Tracking', subtitle: 'Weekly task and hour reporting', icon: 'timesheet', gradient: 'gradient-blue' },
        '/timesheets/approvals': { title: 'Timesheet Approvals', subtitle: 'Review and approve team timesheets', icon: 'timesheet', gradient: 'gradient-orange' },
        '/payslips': { title: 'Payroll & Payslips', subtitle: 'Download and manage your monthly earnings', icon: 'payroll', gradient: 'gradient-blue' },
        '/onboarding/submit': { title: 'Employee Onboarding', subtitle: 'Complete your joining formalities', icon: 'onboarding', gradient: 'gradient-purple' },
        '/settings': { title: 'System Settings', subtitle: 'Configure HRMS rules and preferences', icon: 'settings', gradient: 'gradient-purple' },
        '/users': { title: 'Employee Directory', subtitle: 'Search and manage all staff members', icon: 'employees', gradient: 'gradient-blue' },
        '/analytics': { title: 'Analytics & Insights', subtitle: 'Global HR metrics and reporting', icon: 'analytics', gradient: 'gradient-purple' },
        '/profile': { title: 'My Profile', subtitle: 'Manage your personal and professional info', icon: 'profile', gradient: 'gradient-orange' },
        '/recruitment/jobs': { title: 'Job Openings', subtitle: 'Manage active career opportunities', icon: 'careers', gradient: 'gradient-blue' },
        '/expenses': { title: 'Expense Claims', subtitle: 'Submit your business reimbursement requests', icon: 'expenses', gradient: 'gradient-orange' }
    };

    const isDashboard = location.pathname === '/';
    const currentPage = pageConfig[location.pathname] || { title: 'Citrux HRMS', icon: 'dashboard', gradient: 'gradient-purple' };


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





    const handleLogout = () => {
        setIsMobileMenuOpen(false);
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        logout();
        navigate('/login');
    };



    const sidebarContent = (
        <>
            <div className={`
                ${collapsed ? 'sidebar-content-collapsed' : 'sidebar-content-expanded'} 
                sidebar-content-wrapper
            `}>
                <div className="sidebar-header">
                    {companyLogo ? (
                        <div className="h-10 w-auto max-w-[150px] flex items-center justify-start">
                            <img src={companyLogo} alt="Logo" className="h-full w-auto object-contain" />
                        </div>
                    ) : (
                        <div className="logo-box">{companyName.charAt(0)}</div>
                    )}
                    {(!collapsed || isMobile) && (
                        <h2 className="logo-text">{companyName}</h2>
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
                <Link to="/timesheets" className="nav-link" onClick={() => isMobile && setIsMobileMenuOpen(false)}>
                    <Icon name="timesheet" size={20} />
                    {(!collapsed || isMobile) && <span>Timesheet</span>}
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

                        <Link to="/timesheets/approvals" className="nav-link" onClick={() => isMobile && setIsMobileMenuOpen(false)}>
                            <Icon name="timesheet" size={20} />
                            {(!collapsed || isMobile) && <span>TS Approvals</span>}
                        </Link>
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
                        <Avatar size="40px" fontSize="0.9rem" />
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
                    <h2 className="mobile-logo-text">{companyName}</h2>
                    <Avatar size="36px" fontSize="0.8rem" />
                </div>
            )}

            {/* Main Content */}
            <div className={`content-transition main-content ${isMobile ? 'content-mobile' : 'content-desktop'} ${!isMobile && (collapsed ? 'content-collapsed' : 'content-expanded')}`}>
                {/* Desktop Header */}
                {!isMobile && (
                    <header className="desktop-header">
                        <div className="flex-1">
                            {/* We can put a search bar here later */}
                        </div>
                        <div className="flex items-center gap-6">
                            <NotificationBell />
                            <ProfileDropdown onLogoutRequest={handleLogout} />
                        </div>
                    </header>
                )}

                <main className={`main-scroll-area ${isMobile ? 'main-scroll-padding-mobile' : 'main-scroll-padding-desktop'}`}>
                    {!isDashboard && (
                        <PageHeader
                            title={currentPage.title}
                            subtitle={currentPage.subtitle}
                            icon={currentPage.icon}
                            gradient={currentPage.gradient}
                        />
                    )}
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
