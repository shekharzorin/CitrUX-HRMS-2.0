import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const Dashboard: React.FC = () => {
    const { user } = useAuth(); // Token kept if needed for prop drilling, but api handles auth.
    const [stats, setStats] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        if (user?.role === 'ADMIN' || user?.role === 'HR') {
            fetchStats();
        }
        fetchNotifications();

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [user]);

    const fetchStats = async () => {
        try {
            const data = await api.get<any>('/stats');
            setStats(data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchNotifications = async () => {
        try {
            const data = await api.get<any[]>('/notifications');
            setNotifications(data);
        } catch (error) {
            console.error(error);
        }
    };

    const Card = ({ title, value, sub, icon, colorClass, link }: any) => (
        <Link to={link || "#"} className="dashboard-stat-card glass-card">
            <div className={`dashboard-stat-bg-circle ${colorClass || 'bg-primary'}`}></div>

            <div className="dashboard-stat-header">
                <span className="dashboard-stat-title">{title}</span>
                <span className="dashboard-stat-icon">{icon}</span>
            </div>

            <div className="dashboard-stat-value">
                {value}
            </div>

            <div className="dashboard-stat-sub">
                {sub}
            </div>
        </Link>
    );

    return (
        <div className="dashboard-container">
            <div className="dashboard-header-row">
                <div>
                    <h1 className="dashboard-greeting">
                        Hi, {user?.profile?.firstName || user?.email?.split('@')[0]} 👋
                    </h1>
                    <p className="dashboard-subtitle">
                        Welcome back! Here's a snapshot of your organization.
                    </p>
                </div>

                {/* Live Clock Widget */}
                <div className="dashboard-clock-card glass-card">
                    <div className="dashboard-clock-time-section">
                        <div className="dashboard-clock-time">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="dashboard-clock-label">Current Time</div>
                    </div>
                    <div>
                        <div className="dashboard-clock-date">
                            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="dashboard-clock-year">{currentTime.getFullYear()}</div>
                    </div>
                </div>
            </div>

            {/* Admin Stats Grid */}
            {(user?.role === 'ADMIN' || user?.role === 'HR') && stats && (
                <div className="dashboard-stats-grid">
                    <Card
                        title="Total Workforce"
                        value={stats.users?.total || 0}
                        sub={`${stats.users?.active || 0} currently active`}
                        icon="👥"
                        colorClass="bg-primary"
                        link="/users"
                    />
                    <Card
                        title="Attendance"
                        value={stats.attendance?.presentToday || 0}
                        sub="Employees present today"
                        icon="⏱️"
                        colorClass="bg-success"
                        link="/attendance"
                    />
                    <Card
                        title="Open Positions"
                        value={stats.recruitment?.openJobs || 0}
                        sub="Active job listings"
                        icon="💼"
                        colorClass="bg-info"
                        link="/recruitment/jobs"
                    />
                    <Card
                        title="Finance"
                        value={`₹${stats.finance?.pendingClaims || 0}`}
                        sub="Pending expense claims"
                        icon="💸"
                        colorClass="bg-warning"
                        link="/expenses/approvals"
                    />
                </div>
            )}

            {/* Main Content Layout */}
            <div className="dashboard-main-layout">

                {/* Left Column: Team Status & Actions */}
                <div className="dashboard-column">
                    {/* Who's Out Today */}
                    <div className="card dashboard-card-padding">
                        <div className="dashboard-section-header">
                            <h2 className="dashboard-section-title">
                                <span className="dashboard-section-icon">🌴</span> Who's Out Today
                            </h2>
                            <span className="dashboard-date-badge">Dec 24, 2025</span>
                        </div>

                        <div className="dashboard-whos-out-grid">
                            {[
                                { name: 'Sarah J.', colorClass: 'bg-primary', status: 'Sick' },
                                { name: 'Mike R.', colorClass: 'bg-info', status: 'Vacation' },
                                { name: 'John D.', colorClass: 'bg-success', status: 'Personal' },
                                { name: 'Emma W.', colorClass: 'bg-warning', status: 'Travel' }
                            ].map((person, idx) => (
                                <div key={idx} className="dashboard-out-item" title={`${person.name} (${person.status})`}>
                                    <div className={`dashboard-out-avatar ${person.colorClass}`}>
                                        {person.name.charAt(0)}
                                    </div>
                                    <div className="dashboard-out-status-dot" />
                                </div>
                            ))}
                            <div className="dashboard-out-more">
                                +3
                            </div>
                        </div>
                        <p className="dashboard-out-summary">
                            7 employees are on leave today. <Link to="/leaves" className="dashboard-link">View Calendar &rarr;</Link>
                        </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="card dashboard-card-padding">
                        <h2 className="dashboard-section-title mb-8">
                            <span className="dashboard-section-icon">⚡</span> Quick Actions
                        </h2>
                        <div className="dashboard-quick-actions-grid">
                            <Link to="/leaves" style={{ textDecoration: 'none' }}>
                                <div className="btn-secondary dashboard-action-btn">
                                    <span className="dashboard-action-icon">🌴</span>
                                    <span className="dashboard-action-label">Leave</span>
                                </div>
                            </Link>
                            <Link to="/attendance" style={{ textDecoration: 'none' }}>
                                <div className="btn-secondary dashboard-action-btn">
                                    <span className="dashboard-action-icon">⏱️</span>
                                    <span className="dashboard-action-label">Check-in</span>
                                </div>
                            </Link>
                            <Link to="/payslips" style={{ textDecoration: 'none' }}>
                                <div className="btn-secondary dashboard-action-btn">
                                    <span className="dashboard-action-icon">📄</span>
                                    <span className="dashboard-action-label">Payslip</span>
                                </div>
                            </Link>
                            <Link to="/profile" style={{ textDecoration: 'none' }}>
                                <div className="btn-secondary dashboard-action-btn">
                                    <span className="dashboard-action-icon">👤</span>
                                    <span className="dashboard-action-label">Profile</span>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Column: Announcements */}
                <div className="card dashboard-card-padding">
                    <div className="dashboard-section-header">
                        <h2 className="dashboard-section-title">
                            <span className="dashboard-section-icon">📢</span> Announcements
                        </h2>
                        {notifications.length > 0 && (
                            <span className="dashboard-new-badge">
                                {notifications.length} NEW
                            </span>
                        )}
                    </div>

                    <div className="dashboard-announcement-list">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <div key={n.id} className="dashboard-announcement-item">
                                    <div className="dashboard-announcement-msg">{n.message}</div>
                                    <div className="dashboard-announcement-date">
                                        {new Date(n.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="dashboard-empty-state">
                                <div className="dashboard-empty-icon">✨</div>
                                <p className="dashboard-empty-text">All caught up! No new announcements.</p>
                            </div>
                        )}
                    </div>

                    {/* Feedback Widget */}
                    <div className="glass-card dashboard-feedback-card">
                        <div className="dashboard-feedback-title">Enjoying Citrux?</div>
                        <p className="dashboard-feedback-text">Share your feedback to help us improve your experience.</p>
                        <button className="btn dashboard-feedback-btn">Give Feedback</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;