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

    const Card = ({ title, value, sub, color }: any) => (
        <div className="dashboard-card">
            <div className="text-bold-caps">{title}</div>
            <div className={`text-value-lg ${color}`}>{value}</div>
            {sub && <div className="text-muted-sm mt-2">{sub}</div>}
        </div>
    );

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Welcome, {user?.profile?.firstName || user?.email} 👋</h1>
                    <p style={{ color: 'var(--text-muted)' }}>{user?.profile?.designation || user?.role}</p>
                </div>
            </div>

            {/* Notifications Section */}
            {notifications.length > 0 && (
                <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
                    <h3 style={{ marginBottom: '1rem' }}>📢 Announcements</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {notifications.map(n => (
                            <li key={n.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)', opacity: n.read ? 0.6 : 1, display: 'flex', gap: '0.5rem' }}>
                                <span style={{ color: 'var(--primary)' }}>•</span> {n.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Admin Stats */}
            {(user?.role === 'ADMIN' || user?.role === 'HR') && stats && (
                <div className="grid-3">
                    <Link to="/users" style={{ textDecoration: 'none' }}>
                        <Card title="Total Employees" value={stats.users?.total} sub={`${stats.users?.active} Active Users`} color="text-slate-800" />
                    </Link>
                    <Link to="/attendance" style={{ textDecoration: 'none' }}>
                        <Card title="Present Today" value={stats.attendance?.presentToday || 0} sub="Check-ins recorded" color="text-green-600" />
                    </Link>
                    <Link to="/recruitment/jobs" style={{ textDecoration: 'none' }}>
                        <Card title="Open Jobs" value={stats.recruitment?.openJobs} sub="Role vacancies" color="text-blue-600" />
                    </Link>
                    <Link to="/expenses/approvals" style={{ textDecoration: 'none' }}>
                        <Card title="Pending Expenses" value={stats.finance?.pendingClaims} sub={`$${stats.finance?.approvedTotal} Approved YTD`} color="text-amber-600" />
                    </Link>
                    <Link to="/assets" style={{ textDecoration: 'none' }}>
                        <Card title="Assigned Assets" value={stats.assets?.assigned} sub="Devices in use" color="text-purple-600" />
                    </Link>
                </div>
            )}

            {/* Employee Widgets */}
            {(user?.role === 'EMPLOYEE' || user?.role === 'INTERN') && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', color: 'white' }}>
                        <h3 style={{ marginTop: 0, color: 'white' }}>⏱️ Attendance Status</h3>
                        <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)' }}>Don't forget to mark your attendance today.</p>
                        <Link to="/attendance" style={{ display: 'inline-block', marginTop: '1rem', background: 'white', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>Check In/Out</Link>
                    </div>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 style={{ marginTop: 0 }}>💰 Latest Payslip</h3>
                        <p>View your earnings and deductions.</p>
                        <Link to="/payslips" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>View Statement &rarr;</Link>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>⚡ Quick Actions</h2>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <Link to="/attendance" className="btn-primary" style={{ textDecoration: 'none', background: 'white', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: 'none' }}>Attendance</Link>
                    <Link to="/payslips" className="btn-primary" style={{ textDecoration: 'none', background: 'white', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: 'none' }}>Payslips</Link>

                    {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                        <>
                            <Link to="/users" className="btn-primary" style={{ textDecoration: 'none', background: 'white', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: 'none' }}>Manage Users</Link>
                            <Link to="/users/create" className="btn-primary" style={{ textDecoration: 'none' }}>➕ Add User</Link>
                            <Link to="/certificates/issue" className="btn-primary" style={{ textDecoration: 'none', background: 'white', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: 'none' }}>Issue Certificate</Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
