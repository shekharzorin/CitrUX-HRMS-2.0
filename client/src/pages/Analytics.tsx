import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
// import { Button } from '../components/ui/Button';

const Analytics: React.FC = () => {
    // const { } = useAuth(); // Token kept for consistency
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

    // getTrendColor removed as unused

    if (!stats) return <div className="p-6">Loading Analytics...</div>;

    const Card = ({ title, value, sub, icon, link }: any) => (
        <Link
            to={link || "#"}
            className={`glass-panel analytics-card hover:translate-y-[-2px] ${link ? 'analytics-card-clickable' : ''}`}
        >
            <div className="analytics-card-header">
                <span className="analytics-card-title">{title}</span>
                {icon && (
                    <div className="analytics-card-icon glassy-icon-base">
                        <Icon name={icon as any} size={18} />
                    </div>
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
        <div className="space-y-8">

            <div className="analytics-grid">
                <Card
                    title="Total Employees"
                    value={stats.users.total}
                    sub={`${stats.users.active} Active Users`}
                    icon="employees"
                    link="/users"
                />
                <Card
                    title="Present Today"
                    value={stats.attendance.presentToday || 0}
                    sub="Check-ins recorded"
                    colorClass="success"
                    icon="attendance"
                    link="/attendance"
                />
                <Card
                    title="Open Jobs"
                    value={stats.recruitment.openJobs}
                    sub="Role vacancies"
                    colorClass="info"
                    icon="careers"
                    link="/recruitment/jobs"
                />
                <Card
                    title="Pending Expenses"
                    value={stats.finance.pendingClaims}
                    sub={`₹${stats.finance.approvedTotal} Approved YTD`}
                    colorClass="warning"
                    icon="expenses"
                    link="/expenses/approvals"
                />
                <Card
                    title="Assigned Assets"
                    value={stats.assets.assigned}
                    sub="Devices in use"
                    colorClass="primary"
                    icon="onboarding"
                    link="/assets"
                />
            </div>

            <h2 className="analytics-section-title">Performance & Trends</h2>
            <div className="analytics-charts-grid">
                {/* Placeholder for future charts */}
                <div className="glass-panel analytics-chart-placeholder">
                    <div className="analytics-chart-icon text-[var(--primary)]">
                        <Icon name="analytics" size={48} />
                    </div>
                    <div className="analytics-chart-title">Expense Trends</div>
                    <div className="analytics-chart-subtitle">(Coming Soon in v2.1)</div>
                </div>
                <div className="glass-panel analytics-chart-placeholder">
                    <div className="analytics-chart-icon text-[var(--secondary)]">
                        <Icon name="employees" size={48} />
                    </div>
                    <div className="analytics-chart-title">Department Distribution</div>
                    <div className="analytics-chart-subtitle">(Coming Soon in v2.1)</div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
