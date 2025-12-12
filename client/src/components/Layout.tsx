import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();

    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };



    const [collapsed, setCollapsed] = React.useState(false);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
            {/* Sidebar */}
            <aside className="sidebar-transition" style={{
                width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)',
                background: 'var(--sidebar-bg)',
                color: 'var(--sidebar-text)',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                height: '100%',
                zIndex: 100,
                boxShadow: '4px 0 24px rgba(0,0,0,0.05)',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: collapsed ? '1.5rem 0.5rem' : '1.5rem 1.5rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>C</div>
                        {!collapsed && <h2 style={{ color: 'white', marginBottom: 0, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>Citrux</h2>}
                    </div>
                    <button onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-white transition-colors" style={{ display: collapsed ? 'none' : 'block' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                </div>

                {collapsed && (
                    <button onClick={() => setCollapsed(false)} className="mx-auto mt-2 text-slate-400 hover:text-white">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                )}


                <nav style={{ flex: 1, padding: '1.5rem 1rem', overflowY: 'auto' }}>
                    {!collapsed && <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>Menu</p>}

                    <Link to="/" className="nav-link" title="Dashboard">
                        <span className="text-xl">📊</span>
                        {!collapsed && <span>Dashboard</span>}
                    </Link>
                    <Link to="/attendance" className="nav-link" title="Attendance">
                        <span className="text-xl">⏱️</span>
                        {!collapsed && <span>Attendance</span>}
                    </Link>
                    <Link to="/timesheets" className="nav-link" title="Timesheets">
                        <span className="text-xl">📅</span>
                        {!collapsed && <span>Timesheets</span>}
                    </Link>
                    <Link to="/leaves" className="nav-link" title="Leaves">
                        <span className="text-xl">🌴</span>
                        {!collapsed && <span>Leaves</span>}
                    </Link>
                    <Link to="/payslips" className="nav-link" title="Payslips">
                        <span className="text-xl">💰</span>
                        {!collapsed && <span>Payslips</span>}
                    </Link>
                    <Link to="/onboarding/submit" className="nav-link" title="Onboarding">
                        <span className="text-xl">🚀</span>
                        {!collapsed && <span>Onboarding</span>}
                    </Link>
                    <Link to="/offboarding" className="nav-link" title="Offboarding">
                        <span className="text-xl">👋</span>
                        {!collapsed && <span>Offboarding</span>}
                    </Link>
                    <Link to="/performance" className="nav-link" title="Performance">
                        <span className="text-xl">🎯</span>
                        {!collapsed && <span>Performance</span>}
                    </Link>
                    <Link to="/recruitment/jobs" className="nav-link" title="Careers">
                        <span className="text-xl">💼</span>
                        {!collapsed && <span>Careers</span>}
                    </Link>
                    <Link to="/expenses" className="nav-link" title="Expenses">
                        <span className="text-xl">💸</span>
                        {!collapsed && <span>Expenses</span>}
                    </Link>
                    <Link to="/my-assets" className="nav-link" title="My Assets">
                        <span className="text-xl">💻</span>
                        {!collapsed && <span>My Assets</span>}
                    </Link>
                    <Link to="/profile" className="nav-link" title="My Profile">
                        <span className="text-xl">👤</span>
                        {!collapsed && <span>My Profile</span>}
                    </Link>
                    <Link to="/manager/leaves" className="nav-link" title="Team Leaves">
                        <span className="text-xl">📋</span>
                        {!collapsed && <span>Team Leaves</span>}
                    </Link>

                    {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                        <>
                            <div style={{ margin: '2rem 0 1rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}></div>
                            {!collapsed && <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>Administration</p>}

                            <Link to="/users" className="nav-link" title="Employees">
                                <span className="text-xl">👥</span>
                                {!collapsed && <span>Employees</span>}
                            </Link>
                            <Link to="/onboarding/admin" className="nav-link" title="Approvals">
                                <span className="text-xl">📋</span>
                                {!collapsed && <span>Approvals</span>}
                            </Link>
                            <Link to="/certificates/issue" className="nav-link" title="Certificates">
                                <span className="text-xl">🎓</span>
                                {!collapsed && <span>Certificates</span>}
                            </Link>
                            <Link to="/performance/reviews" className="nav-link" title="Reviews">
                                <span className="text-xl">⭐</span>
                                {!collapsed && <span>Reviews</span>}
                            </Link>
                            <Link to="/recruitment/applications" className="nav-link" title="ATS">
                                <span className="text-xl">📄</span>
                                {!collapsed && <span>ATS</span>}
                            </Link>
                            <Link to="/expenses/approvals" className="nav-link" title="Expense Approvals">
                                <span className="text-xl">✅</span>
                                {!collapsed && <span>Exp. Approvals</span>}
                            </Link>
                            <Link to="/assets" className="nav-link" title="Assets">
                                <span className="text-xl">📦</span>
                                {!collapsed && <span>Inventory</span>}
                            </Link>
                            <Link to="/admin/shifts" className="nav-link" title="Shifts">
                                <span className="text-xl">⏰</span>
                                {!collapsed && <span>Shifts</span>}
                            </Link>
                            <Link to="/admin/salary" className="nav-link" title="Payroll">
                                <span className="text-xl">💸</span>
                                {!collapsed && <span>Payroll</span>}
                            </Link>
                            <Link to="/analytics" className="nav-link" title="Analytics">
                                <span className="text-xl">📈</span>
                                {!collapsed && <span>Analytics</span>}
                            </Link>
                        </>
                    )}
                </nav>

                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: collapsed ? 'center' : 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, flexShrink: 0 }}>
                            {user?.profile?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                        </div>
                        {!collapsed && (
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.profile?.firstName}</div>
                                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{user?.role}</div>
                            </div>
                        )}
                    </div>
                    {!collapsed && <button onClick={handleLogout} className="btn-primary" style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Logout</button>}
                    {collapsed && (
                        <button onClick={handleLogout} className="btn-primary p-2 flex justify-center w-full" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <span className="text-sm">🚪</span>
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="content-transition" style={{ flex: 1, marginLeft: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                {/* Top Header */}
                <header style={{
                    background: 'white',
                    padding: '1rem 2rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 90
                }}>
                    <h2 className="text-xl font-bold text-slate-700">Citrux HRMS</h2>
                    <div className="flex items-center gap-4">
                        <Link to="/notifications" className="relative p-2 text-slate-500 hover:text-slate-800 transition-colors">
                            <span className="text-xl">🔔</span>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                {user?.email[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-slate-600 hidden md:inline">{user?.email}</span>
                        </div>
                    </div>
                </header>

                {/* Content - Scrollable */}
                <main style={{ flex: 1, overflowY: 'auto', padding: '2rem', background: 'var(--background)' }}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
