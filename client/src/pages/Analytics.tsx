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

    const Card = ({ title, value, sub, color }: any) => (
        <div className="dashboard-card">
            <div className="text-bold-caps">{title}</div>
            <div className={`text-value-lg ${color}`}>{value}</div>
            {sub && <div className="text-muted-sm mt-2">{sub}</div>}
        </div>
    );

    return (
        <div className="page-container">
            <h1 className="text-xl font-bold mb-6 text-slate-800">HR Analytics Dashboard</h1>

            <div className="grid-3">
                <Link to="/users" style={{ textDecoration: 'none' }}>
                    <Card title="Total Employees" value={stats.users.total} sub={`${stats.users.active} Active Users`} color="text-slate-800" />
                </Link>
                <Link to="/attendance" style={{ textDecoration: 'none' }}>
                    <Card title="Present Today" value={stats.attendance.presentToday || 0} sub="Check-ins recorded" color="text-green-600" />
                </Link>
                <Link to="/recruitment/jobs" style={{ textDecoration: 'none' }}>
                    <Card title="Open Jobs" value={stats.recruitment.openJobs} sub="Role vacancies" color="text-blue-600" />
                </Link>
                <Link to="/expenses/approvals" style={{ textDecoration: 'none' }}>
                    <Card title="Pending Expenses" value={stats.finance.pendingClaims} sub={`$${stats.finance.approvedTotal} Approved YTD`} color="text-amber-600" />
                </Link>
                <Link to="/assets" style={{ textDecoration: 'none' }}>
                    <Card title="Assigned Assets" value={stats.assets.assigned} sub="Devices in use" color="text-purple-600" />
                </Link>
            </div>

            <div className="grid-3">
                {/* Placeholder for future charts */}
                <div className="dashboard-card h-64 flex items-center justify-center">
                    <div className="text-center" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📊</div>
                        <div className="text-bold-caps">Expense Trends</div>
                        <div className="text-muted-sm">(Coming Soon in v2.1)</div>
                    </div>
                </div>
                <div className="dashboard-card h-64 flex items-center justify-center">
                    <div className="text-center" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🥧</div>
                        <div className="text-bold-caps">Dept Distribution</div>
                        <div className="text-muted-sm">(Coming Soon in v2.1)</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
