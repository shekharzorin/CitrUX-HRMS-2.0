import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Analytics: React.FC = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/stats', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setStats(await res.json());
        } catch (error) { console.error(error); }
    };

    if (!stats) return <div className="p-6">Loading Analytics...</div>;

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
            <h1 style={{ marginBottom: '2.5rem', fontSize: '1.5rem', fontWeight: 700 }}>HR Analytics Dashboard</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <Card
                    title="Total Employees"
                    value={stats.users.total}
                    sub={`${stats.users.active} Active Users`}
                    icon="👥"
                    link="/users"
                />
                <Card
                    title="Present Today"
                    value={stats.attendance.presentToday || 0}
                    sub="Check-ins recorded"
                    colorClass="success"
                    icon="⏱️"
                    link="/attendance"
                />
                <Card
                    title="Open Jobs"
                    value={stats.recruitment.openJobs}
                    sub="Role vacancies"
                    colorClass="info"
                    icon="💼"
                    link="/recruitment/jobs"
                />
                <Card
                    title="Pending Expenses"
                    value={stats.finance.pendingClaims}
                    sub={`$${stats.finance.approvedTotal} Approved YTD`}
                    colorClass="warning"
                    icon="💸"
                    link="/expenses/approvals"
                />
                <Card
                    title="Assigned Assets"
                    value={stats.assets.assigned}
                    sub="Devices in use"
                    colorClass="primary"
                    icon="💻"
                    link="/assets"
                />
            </div>

            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>Performance & Trends</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* Placeholder for future charts */}
                <div className="glass-panel" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📊</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Expense Trends</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>(Coming Soon in v2.1)</div>
                </div>
                <div className="glass-panel" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🥧</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Department Distribution</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>(Coming Soon in v2.1)</div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
