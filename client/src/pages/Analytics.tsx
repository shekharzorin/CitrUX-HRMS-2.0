import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const Analytics: React.FC = () => {
    const { } = useAuth(); // Token kept for consistency
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const data = await api.get<any>('/stats');
            setStats(data);
        } catch (error) { console.error(error); }
    };

    if (!stats) return <div className="p-6">Loading Analytics...</div>;

    const Card = ({ title, value, sub, icon, colorClass, link }: any) => (
        <Link
            to={link || "#"}
            className={`glass-panel analytics-card hover:translate-y-[-2px] ${link ? 'analytics-card-clickable' : ''}`}
        >
            <div className="analytics-card-header">
                <span className="analytics-card-title">{title}</span>
                {icon && (
                    <div
                        className={`analytics-card-icon-bg ${colorClass ? `bg-${colorClass}` : 'bg-default-bg'}`}
                    ></div>
                )}
                {icon && (
                    <span
                        className={`analytics-card-icon ${colorClass ? `text-${colorClass}` : 'text-main'}`}
                    >{icon}</span>
                )}
            </div>

            <div className="analytics-card-value">
                {value}
            </div>

            <div className="analytics-card-subtitle">
                {sub}
            </div>
        </Link>
    );

    return (
        <div className="page-container">
            <h1 className="analytics-title">HR Analytics Dashboard</h1>

            <div className="analytics-grid">
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

            <h2 className="analytics-section-title">Performance & Trends</h2>
            <div className="analytics-charts-grid">
                {/* Placeholder for future charts */}
                <div className="glass-panel analytics-chart-placeholder">
                    <div className="analytics-chart-icon">📊</div>
                    <div className="analytics-chart-title">Expense Trends</div>
                    <div className="analytics-chart-subtitle">(Coming Soon in v2.1)</div>
                </div>
                <div className="glass-panel analytics-chart-placeholder">
                    <div className="analytics-chart-icon">🥧</div>
                    <div className="analytics-chart-title">Department Distribution</div>
                    <div className="analytics-chart-subtitle">(Coming Soon in v2.1)</div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
