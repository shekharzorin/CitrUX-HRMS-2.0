import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Breadcrumbs logic
    const pathnames = location.pathname.split('/').filter((x) => x);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
            {/* Sidebar - Keka Style (Dark) */}
            <aside style={{
                width: '260px',
                background: 'var(--sidebar-bg)',
                color: 'var(--sidebar-text)',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                height: '100%',
                zIndex: 100,
                boxShadow: '4px 0 24px rgba(0,0,0,0.05)'
            }}>
                <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>C</div>
                        <h2 style={{ color: 'white', marginBottom: 0, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>Citrux</h2>
                    </div>
                </div>

                <nav style={{ flex: 1, padding: '1.5rem 1rem', overflowY: 'auto' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>Menu</p>

                    <Link to="/" className="nav-link">📊 Dashboard</Link>
                    <Link to="/attendance" className="nav-link">⏱️ Attendance</Link>
                    <Link to="/timesheets" className="nav-link">📅 Timesheets</Link>
                    <Link to="/leaves" className="nav-link">🌴 Leave / Time Off</Link>
                    <Link to="/payslips" className="nav-link">💰 Payslips</Link>
                    <Link to="/onboarding/submit" className="nav-link">🚀 Onboarding</Link>
                    <Link to="/offboarding" className="nav-link">👋 Offboarding</Link>
                    <Link to="/performance" className="nav-link">🎯 Performance</Link>
                    <Link to="/recruitment/jobs" className="nav-link">💼 Careers</Link>
                    <Link to="/expenses" className="nav-link">💸 Expenses</Link>
                    <Link to="/my-assets" className="nav-link">💻 My Assets</Link>
                    <Link to="/profile" className="nav-link">👤 My Profile</Link>
                    <Link to="/manager/leaves" className="nav-link">📋 Team Leaves</Link>

                    {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                        <>
                            <div style={{ margin: '2rem 0 1rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}></div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>Administration</p>
                            <Link to="/users" className="nav-link">👥 Employees</Link>
                            <Link to="/onboarding/admin" className="nav-link">📋 Approvals</Link>
                            <Link to="/certificates/issue" className="nav-link">🎓 Certificates</Link>
                            <Link to="/performance/reviews" className="nav-link">⭐ Reviews</Link>
                            <Link to="/recruitment/applications" className="nav-link">📄 ATS</Link>
                            <Link to="/expenses/approvals" className="nav-link">✅ Exp. Approvals</Link>
                            <Link to="/assets" className="nav-link">📦 Asset Inventory</Link>
                            <Link to="/admin/shifts" className="nav-link">⏰ Shifts</Link>
                            <Link to="/admin/salary" className="nav-link">💸 Payroll</Link>
                            <Link to="/analytics" className="nav-link">📈 Analytics</Link>
                        </>
                    )}
                </nav>

                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                            {user?.profile?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.profile?.firstName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{user?.role}</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn-primary" style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Logout</button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div style={{ flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
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
