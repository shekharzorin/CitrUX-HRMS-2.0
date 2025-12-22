import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
    const { user, token } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        if (user?.role === 'ADMIN' || user?.role === 'HR') {
            fetchStats();
        }
        fetchNotifications();
    }, [user]);

    const fetchStats = async () => {
        try {
            // Using the new detailed stats API
            const response = await fetch('http://localhost:5000/api/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchNotifications = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setNotifications(data);
        } catch (error) {
            console.error(error);
        }
    };

    const Card = ({ title, value, sub, icon, colorClass, link }: any) => (
        <Link to={link || "#"} className="glass-panel hover:translate-y-[-2px]" style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.2s ease',
            cursor: link ? 'pointer' : 'default',
            padding: '1.5rem',
            border: '1px solid var(--border-color)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
                {icon && (
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: colorClass ? `var(--${colorClass})` : 'var(--bg-body)',
                        opacity: 0.15,
                        position: 'absolute',
                        right: '1.5rem',
                        top: '1.5rem',
                        pointerEvents: 'none'
                    }}></div>
                )}
                {icon && (
                    <span style={{
                        fontSize: '1.5rem',
                        color: colorClass ? `var(--${colorClass})` : 'var(--text-main)',
                        zIndex: 1
                    }}>{icon}</span>
                )}
            </div>

            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1, marginBottom: '0.75rem' }}>
                {value}
            </div>

            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {sub}
            </div>
        </Link>
    );

    return (
        <div className="page-container">
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ marginBottom: '0.25rem' }}>Welcome, {user?.profile?.firstName || user?.email?.split('@')[0]} 👋</h1>
                <p style={{ color: 'var(--text-muted)' }}>Here's what's happening in your workspace today.</p>
            </div>

            {/* Notifications Section */}
            {notifications.length > 0 && (
                <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-surface)' }}>
                    <span style={{ fontSize: '1.25rem' }}>📢</span>
                    <div style={{ flex: 1 }}>
                        {notifications.map(n => (
                            <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{n.message}</span>
                                {n.date && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(n.date).toLocaleDateString()}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Admin Stats Grid */}
            {(user?.role === 'ADMIN' || user?.role === 'HR') && stats && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <Card
                            title="Total Employees"
                            value={stats.users?.total || 0}
                            sub={`${stats.users?.active || 0} Active Users`}
                            icon="👥"
                            link="/users"
                        />
                        <Card
                            title="Present Today"
                            value={stats.attendance?.presentToday || 0}
                            sub="Check-ins recorded"
                            colorClass="success"
                            icon="⏱️"
                            link="/attendance"
                        />
                        <Card
                            title="Open Jobs"
                            value={stats.recruitment?.openJobs || 0}
                            sub="Role vacancies"
                            colorClass="info"
                            icon="💼"
                            link="/recruitment/jobs"
                        />
                        <Card
                            title="Pending Expenses"
                            value={stats.finance?.pendingClaims || 0}
                            sub={`$${stats.finance?.approvedTotal || 0} Approved YTD`}
                            colorClass="warning"
                            icon="💸"
                            link="/expenses/approvals"
                        />
                        <Card
                            title="Assigned Assets"
                            value={stats.assets?.assigned || 0}
                            sub="Devices in use"
                            colorClass="primary"
                            icon="💻"
                            link="/assets"
                        />
                    </div>
                </>
            )}

            {/* Employee Widgets Grid */}
            {(user?.role === 'EMPLOYEE' || user?.role === 'INTERN') && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '200px' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⏱️</div>
                            <h3 style={{ marginTop: 0, color: 'white', fontSize: '1.5rem' }}>Attendance</h3>
                            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.9)', margin: 0 }}>Mark your attendance for today.</p>
                        </div>
                        <Link to="/attendance" className="btn" style={{ background: 'white', color: 'var(--primary)', alignSelf: 'start', marginTop: '1.5rem', border: 'none' }}>Check In/Out &rarr;</Link>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '200px' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💰</div>
                            <h3 style={{ marginTop: 0, fontSize: '1.5rem' }}>Payslips</h3>
                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>View earnings & deductions.</p>
                        </div>
                        <Link to="/payslips" className="btn-secondary" style={{ alignSelf: 'start', marginTop: '1.5rem' }}>View Statement</Link>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>⚡</span> Quick Actions
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem' }}>
                    <Link to="/attendance" className="btn-secondary quick-action-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'start', textDecoration: 'none', background: 'var(--bg-body)' }}>⏱️ Attendance</Link>
                    <Link to="/payslips" className="btn-secondary quick-action-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'start', textDecoration: 'none', background: 'var(--bg-body)' }}>💰 Payslips</Link>
                    <Link to="/leaves" className="btn-secondary quick-action-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'start', textDecoration: 'none', background: 'var(--bg-body)' }}>🌴 Apply Leave</Link>

                    {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                        <>
                            <Link to="/users" className="btn-secondary quick-action-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'start', textDecoration: 'none', background: 'var(--bg-body)' }}>👥 Manage Users</Link>
                            <Link to="/users/create" className="btn-primary quick-action-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>➕ Add User</Link>
                            <Link to="/certificates/issue" className="btn-secondary quick-action-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'start', textDecoration: 'none', background: 'var(--bg-body)' }}>🎓 Issue Certificate</Link>
                            <Link to="/settings" className="btn-secondary quick-action-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'start', textDecoration: 'none', background: 'var(--bg-body)' }}>⚙️ Settings</Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;