import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const colors = [
        '#9d316e', // Default Keka
        '#2563eb', // Blue
        '#16a34a', // Green
        '#d97706', // Amber
        '#9333ea', // Purple
        '#000000', // Black
    ];

    const handleLogout = () => {
        setIsProfileDropdownOpen(false);
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        logout();
        navigate('/login');
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-body)' }}>
            {/* Sidebar */}
            <aside className={`sidebar-transition ${collapsed ? 'sidebar-collapsed' : ''}`} style={{
                width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)',
                background: 'var(--bg-sidebar)',
                color: 'var(--text-sidebar)',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                height: '100%',
                zIndex: 100,
                boxShadow: '4px 0 24px rgba(0,0,0,0.05)',
                overflow: 'hidden',
                borderRight: '1px solid var(--border-color)'
            }}>
                <div style={{
                    padding: collapsed ? '1.5rem 0.5rem' : '1.5rem 1.5rem 1rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {localStorage.getItem('company_logo') ? (
                            <img src={localStorage.getItem('company_logo') || ''} alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px' }} />
                        ) : (
                            <div style={{ width: '36px', height: '36px', background: 'var(--primary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>C</div>
                        )}
                        {!collapsed && <h2 style={{ color: 'var(--text-sidebar-active)', margin: 0, fontSize: '1.25rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.5px' }}>{localStorage.getItem('company_name') || 'Citrux'}</h2>}
                    </div>
                    <button onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-white transition-colors" style={{ display: collapsed ? 'none' : 'block', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sidebar)', padding: '4px' }}>
                        <Icon name="chevron_left" size={20} />
                    </button>
                </div>

                {collapsed && (
                    <button onClick={() => setCollapsed(false)} style={{ display: 'block', margin: '0.5rem auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sidebar)' }}>
                        <Icon name="chevron_right" size={20} />
                    </button>
                )}


                <nav style={{ flex: 1, padding: collapsed ? '1rem 0' : '1.5rem 1rem', overflowY: 'auto' }}>
                    {!collapsed && <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>Menu</p>}

                    <Link to="/" className="nav-link" title="Dashboard">
                        <Icon name="dashboard" size={20} />
                        {!collapsed && <span>Dashboard</span>}
                    </Link>
                    <Link to="/attendance" className="nav-link" title="Attendance">
                        <Icon name="attendance" size={20} />
                        {!collapsed && <span>Attendance</span>}
                    </Link>
                    {user?.role !== 'SUPER_ADMIN' && (
                        <Link to="/timesheets" className="nav-link" title="Timesheets">
                            <Icon name="timesheet" size={20} />
                            {!collapsed && <span>Timesheets</span>}
                        </Link>
                    )}
                    <Link to="/leaves" className="nav-link" title="Leaves">
                        <Icon name="leaves" size={20} />
                        {!collapsed && <span>Leaves</span>}
                    </Link>
                    <Link to="/payslips" className="nav-link" title="Payslips">
                        <Icon name="payroll" size={20} />
                        {!collapsed && <span>Payslips</span>}
                    </Link>
                    <Link to="/onboarding/submit" className="nav-link" title="Onboarding">
                        <Icon name="onboarding" size={20} />
                        {!collapsed && <span>Onboarding</span>}
                    </Link>
                    <Link to="/offboarding" className="nav-link" title="Offboarding">
                        <Icon name="offboarding" size={20} />
                        {!collapsed && <span>Offboarding</span>}
                    </Link>
                    <Link to="/performance" className="nav-link" title="Performance">
                        <Icon name="performance" size={20} />
                        {!collapsed && <span>Performance</span>}
                    </Link>
                    <Link to="/recruitment/jobs" className="nav-link" title="Careers">
                        <Icon name="careers" size={20} />
                        {!collapsed && <span>Careers</span>}
                    </Link>
                    <Link to="/expenses" className="nav-link" title="Expenses">
                        <Icon name="expenses" size={20} />
                        {!collapsed && <span>Expenses</span>}
                    </Link>
                    <Link to="/my-assets" className="nav-link" title="My Assets">
                        <Icon name="assets" size={20} />
                        {!collapsed && <span>My Assets</span>}
                    </Link>
                    <Link to="/profile" className="nav-link" title="My Profile">
                        <Icon name="profile" size={20} />
                        {!collapsed && <span>My Profile</span>}
                    </Link>
                    <Link to="/manager/leaves" className="nav-link" title="Team Leaves">
                        <Icon name="team_leaves" size={20} />
                        {!collapsed && <span>Team Leaves</span>}
                    </Link>

                    {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                        <>
                            <div style={{ margin: '2rem 0 1rem 0', borderTop: '1px solid var(--border-color)' }}></div>
                            {!collapsed && <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>Administration</p>}

                            <Link to="/settings" className="nav-link" title="Settings">
                                <Icon name="settings" size={20} />
                                {!collapsed && <span>Settings</span>}
                            </Link>

                            <Link to="/users" className="nav-link" title="Employees">
                                <Icon name="employees" size={20} />
                                {!collapsed && <span>Employees</span>}
                            </Link>
                            <Link to="/org-chart" className="nav-link" title="Org Chart">
                                <Icon name="org_chart" size={20} />
                                {!collapsed && <span>Org Structure</span>}
                            </Link>
                            <Link to="/onboarding/admin" className="nav-link" title="Approvals">
                                <Icon name="approvals" size={20} />
                                {!collapsed && <span>Approvals</span>}
                            </Link>
                            <Link to="/certificates/issue" className="nav-link" title="Certificates">
                                <Icon name="certificates" size={20} />
                                {!collapsed && <span>Certificates</span>}
                            </Link>
                            <Link to="/performance/reviews" className="nav-link" title="Reviews">
                                <Icon name="reviews" size={20} />
                                {!collapsed && <span>Reviews</span>}
                            </Link>
                            <Link to="/recruitment/applications" className="nav-link" title="ATS">
                                <Icon name="ats" size={20} />
                                {!collapsed && <span>ATS</span>}
                            </Link>
                            <Link to="/expenses/approvals" className="nav-link" title="Expense Approvals">
                                <Icon name="exp_approvals" size={20} />
                                {!collapsed && <span>Exp. Approvals</span>}
                            </Link>
                            <Link to="/assets" className="nav-link" title="Assets">
                                <Icon name="inventory" size={20} />
                                {!collapsed && <span>Inventory</span>}
                            </Link>
                            <Link to="/admin/shifts" className="nav-link" title="Shifts">
                                <Icon name="shifts" size={20} />
                                {!collapsed && <span>Shifts</span>}
                            </Link>
                            <Link to="/admin/salary" className="nav-link" title="Payroll">
                                <Icon name="expenses" size={20} />
                                {!collapsed && <span>Payroll</span>}
                            </Link>
                            <Link to="/analytics" className="nav-link" title="Analytics">
                                <Icon name="analytics" size={20} />
                                {!collapsed && <span>Analytics</span>}
                            </Link>
                        </>
                    )}
                </nav>

                <div style={{ padding: collapsed ? '1rem 0.5rem' : '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: collapsed ? 'center' : 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', fontWeight: 600, flexShrink: 0 }}>
                            {user?.profile?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                        </div>
                        {!collapsed && (
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-sidebar-active)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.profile?.firstName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-center w-full">
                        <Button
                            variant="danger"
                            onClick={handleLogout}
                            className={collapsed ? "p-3 w-12 h-12 justify-center flex items-center" : "w-full"}
                            style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: 'var(--error)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                minWidth: collapsed ? 'auto' : 'unset'
                            }}
                            title={collapsed ? "Logout" : ""}
                        >
                            {collapsed ? <Icon name="logout" size={20} /> : "Logout"}
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="content-transition" style={{ flex: 1, marginLeft: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                {/* Top Header */}
                <header style={{
                    background: 'var(--bg-surface)',
                    padding: '0.75rem 2rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 90
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        {localStorage.getItem('company_name') ? (localStorage.getItem('company_name') + ' HRMS') : 'Citrux HRMS'}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <Link to="/notifications" style={{ textDecoration: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                            <Icon name="notifications" size={20} />
                        </Link>

                        {/* Profile Dropdown Trigger */}
                        <div className="relative" ref={dropdownRef}>
                            <div
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', background: isProfileDropdownOpen ? 'var(--bg-body)' : 'transparent' }}
                            >
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                    {user?.profile?.firstName?.charAt(0) || user?.email[0].toUpperCase()}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2 }}>
                                        {user?.profile?.firstName || user?.email?.split('@')[0]}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</span>
                                </div>
                                <Icon name="arrow_down" size={14} style={{ color: 'var(--text-muted)' }} />
                            </div>

                            {/* Dropdown Menu */}
                            {isProfileDropdownOpen && (
                                <div className="absolute right-0 mt-3 w-72 rounded-xl shadow-2xl border overflow-hidden animate-fade-in"
                                    style={{ top: '100%', right: 0, backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', zIndex: 1000 }}>

                                    <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Signed in as</p>
                                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-main)', margin: 0 }}>{user?.email}</p>
                                    </div>

                                    {/* Theme Settings inside Dropdown */}
                                    <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Appearance</p>

                                        {/* Toggle Mode */}
                                        <div className="flex rounded-lg p-1 mb-5" style={{ backgroundColor: 'var(--bg-body)', border: '1px solid var(--border-color)' }}>
                                            <button
                                                onClick={() => theme === 'dark' && toggleTheme()}
                                                className="flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2"
                                                style={{
                                                    backgroundColor: theme === 'light' ? 'var(--bg-surface)' : 'transparent',
                                                    color: theme === 'light' ? 'var(--text-main)' : 'var(--text-muted)',
                                                    boxShadow: theme === 'light' ? 'var(--shadow-sm)' : 'none',
                                                    border: 'none', cursor: 'pointer'
                                                }}
                                            >
                                                <Icon name="light_mode" size={14} /> Light
                                            </button>
                                            <button
                                                onClick={() => theme === 'light' && toggleTheme()}
                                                className="flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2"
                                                style={{
                                                    backgroundColor: theme === 'dark' ? 'var(--bg-surface)' : 'transparent',
                                                    color: theme === 'dark' ? 'var(--text-main)' : 'var(--text-muted)',
                                                    boxShadow: theme === 'dark' ? 'var(--shadow-sm)' : 'none',
                                                    border: 'none', cursor: 'pointer'
                                                }}
                                            >
                                                <Icon name="dark_mode" size={14} /> Dark
                                            </button>
                                        </div>

                                        {/* Color Picker */}
                                        <div className="flex flex-wrap gap-3 items-center justify-start px-0.5">
                                            {colors.map((c) => (
                                                <button
                                                    key={c}
                                                    onClick={() => setPrimaryColor(c)}
                                                    className="rounded-full transition-all hover:scale-110 active:scale-95"
                                                    style={{
                                                        width: '22px',
                                                        height: '22px',
                                                        backgroundColor: c,
                                                        border: primaryColor === c ? '2px solid var(--text-main)' : '1px solid rgba(0,0,0,0.1)',
                                                        outline: 'none',
                                                        cursor: 'pointer',
                                                        boxShadow: primaryColor === c ? `0 0 0 2px var(--bg-surface), 0 0 0 4px ${c}` : 'none'
                                                    }}
                                                    title={c}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="py-2">
                                        <Link to="/profile" className="px-5 py-2 hover:bg-[var(--bg-body)] transition-colors flex items-center gap-3" style={{ color: 'var(--text-main)', textDecoration: 'none' }} onClick={() => setIsProfileDropdownOpen(false)}>
                                            <div className="flex items-center justify-center w-6">
                                                <Icon name="profile" size={18} />
                                            </div>
                                            <span className="text-sm font-semibold tracking-tight">My Profile</span>
                                        </Link>
                                        <Link to="/settings" className="px-5 py-2 hover:bg-[var(--bg-body)] transition-colors flex items-center gap-3" style={{ color: 'var(--text-main)', textDecoration: 'none' }} onClick={() => setIsProfileDropdownOpen(false)}>
                                            <div className="flex items-center justify-center w-6">
                                                <Icon name="settings" size={18} />
                                            </div>
                                            <span className="text-sm font-semibold tracking-tight">Settings</span>
                                        </Link>
                                    </div>

                                    <div className="border-t p-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'rgba(239, 68, 68, 0.01)' }}>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full px-3 py-2 text-sm hover:bg-red-50 rounded-lg transition-colors flex items-center gap-3 font-bold"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}
                                        >
                                            <div className="flex items-center justify-center w-6">
                                                <Icon name="logout" size={18} />
                                            </div>
                                            <span>Sign Out</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content - Scrollable */}
                <main style={{ flex: 1, overflowY: 'auto', padding: '2rem', background: 'var(--bg-body)' }}>
                    {children}
                </main>
            </div>



            <ConfirmModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={confirmLogout}
                title="Confirm Logout"
                message="Are you sure you want to log out? You will need to sign in again to access the application."
                confirmText="Logout"
                type="danger"
            />
        </div>
    );
};

export default Layout;
