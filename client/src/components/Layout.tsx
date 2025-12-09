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
                    <Link to="/leaves" className="nav-link">🌴 Leave / Time Off</Link>
                    <Link to="/payslips" className="nav-link">💰 Payslips</Link>
                    <Link to="/onboarding/submit" className="nav-link">🚀 Onboarding</Link>

                    {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                        <>
                            <div style={{ margin: '2rem 0 1rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}></div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>Administration</p>
                            <Link to="/users" className="nav-link">👥 Employees</Link>
                            <Link to="/onboarding/admin" className="nav-link">📋 Approvals</Link>
                            <Link to="/certificates/issue" className="nav-link">🎓 Certificates</Link>
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
            <main style={{ flex: 1, marginLeft: '260px', padding: '0' }}>
                {/* Top Header */}
                <header style={{
                    background: 'white',
                    padding: '1rem 2rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 90
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
                        {pathnames.map((value, index) => {
                            const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                            return (
                                <React.Fragment key={to}>
                                    <span>/</span>
                                    <Link to={to} style={{ color: 'var(--primary)', textDecoration: 'none', textTransform: 'capitalize', fontWeight: 500 }}>{value}</Link>
                                </React.Fragment>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {/* Placeholder for header actions if needed */}
                    </div>
                </header>

                <div style={{ padding: '2rem' }}>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
