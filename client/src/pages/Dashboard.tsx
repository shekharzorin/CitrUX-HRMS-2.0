import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([
                (user?.role === 'ADMIN' || user?.role === 'HR') ? fetchStats() : Promise.resolve(),
                fetchNotifications()
            ]);
            setLoading(false);
        };
        loadData();

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
            setNotifications(data || []);
        } catch (error) {
            console.error(error);
            setNotifications([]);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    // Enhanced stat card with gradient backgrounds and icons
    const StatCard = ({ title, value, sub, icon, gradient, link }: any) => {
        const isClickable = link && link !== "#";
        const content = (
            <>
                <div className={`stat-card-gradient ${gradient}`}></div>
                <div className="stat-card-content">
                    <div className={`stat-card-icon-wrapper glassy-icon-base ${gradient.replace('gradient', 'glassy')}`}>
                        <Icon name={icon as any} size={24} />
                    </div>
                    <div className="stat-card-info">
                        <div className="stat-card-label">{title}</div>
                        <div className="stat-card-value">{value}</div>
                        <div className="stat-card-subtitle">{sub}</div>
                    </div>
                </div>
            </>
        );

        if (isClickable) {
            return (
                <Link to={link} className="stat-card stat-card-clickable">
                    {content}
                </Link>
            );
        }

        return <div className="stat-card">{content}</div>;
    };

    // Quick action button component
    const QuickActionButton = ({ to, icon, label, color }: any) => (
        <Link to={to} className="quick-action-link">
            <div className="quick-action-card">
                <div className={`quick-action-icon glassy-icon-base ${color.replace('action', 'glassy')}`}>
                    <Icon name={icon as any} size={32} />
                </div>
                <div className="quick-action-label">{label}</div>
            </div>
        </Link>
    );

    return (
        <div className="dashboard-premium">
            {/* Hero Section with Greeting */}
            <div className="dashboard-hero">
                <div className="dashboard-hero-content">
                    <div className="dashboard-greeting-section">
                        <h1 className="dashboard-hero-title">
                            Welcome back, {user?.profile?.firstName || user?.email?.split('@')[0]}! 👋
                        </h1>
                        <p className="dashboard-hero-subtitle">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>

                    {/* Live Clock Widget - Redesigned */}
                    <div className="dashboard-clock-widget">
                        <div className="clock-time-display">
                            <div className="clock-time">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="clock-seconds">
                                {currentTime.toLocaleTimeString([], { second: '2-digit' })}
                            </div>
                        </div>
                        <div className="clock-icon">
                            <Icon name="schedule" size={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin Stats - Enhanced Design */}
            {(user?.role === 'ADMIN' || user?.role === 'HR') && stats && (
                <div className="stats-grid-premium">
                    <StatCard
                        title="Total Workforce"
                        value={stats.users?.total || 0}
                        sub={`${stats.users?.active || 0} active employees`}
                        icon="employees"
                        gradient="gradient-purple"
                        link="/users"
                    />
                    <StatCard
                        title="Attendance Today"
                        value={stats.attendance?.presentToday || 0}
                        sub="Employees checked in"
                        icon="attendance"
                        gradient="gradient-green"
                        link="/attendance"
                    />
                    <StatCard
                        title="Open Positions"
                        value={stats.recruitment?.openJobs || 0}
                        sub="Active job listings"
                        icon="careers"
                        gradient="gradient-blue"
                        link="/recruitment/jobs"
                    />
                    <StatCard
                        title="Pending Claims"
                        value={`₹${stats.finance?.pendingClaims || 0}`}
                        sub="Expense approvals"
                        icon="expenses"
                        gradient="gradient-orange"
                        link="/expenses/approvals"
                    />
                </div>
            )}

            {/* Main Dashboard Grid */}
            <div className="dashboard-grid-premium">
                {/* Quick Actions Section */}
                <div className="dashboard-section quick-actions-section">
                    <div className="section-header-premium">
                        <div className="section-icon-badge glassy-icon-base glassy-purple">
                            <Icon name="bolt" size={20} />
                        </div>
                        <h2 className="section-title-premium">Quick Actions</h2>
                    </div>
                    <div className="quick-actions-grid-premium">
                        <QuickActionButton to="/leaves" icon="event" label="Request Leave" color="action-purple" />
                        <QuickActionButton to="/attendance" icon="schedule" label="Check In" color="action-green" />
                        <QuickActionButton to="/payslips" icon="payroll" label="View Payslip" color="action-blue" />
                        <QuickActionButton to="/profile" icon="profile" label="My Profile" color="action-orange" />
                    </div>
                </div>

                {/* Who's Out Today */}
                <div className="dashboard-section whos-out-section">
                    <div className="section-header-premium">
                        <div className="section-icon-badge glassy-icon-base glassy-green">
                            <Icon name="event" size={20} />
                        </div>
                        <div className="flex-1">
                            <h2 className="section-title-premium">Who's Out Today</h2>
                            <p className="section-subtitle-premium">Team availability status</p>
                        </div>
                        <span className="status-badge">7 on leave</span>
                    </div>

                    <div className="team-avatars-grid">
                        {[
                            { name: 'Sarah Johnson', icon: 'profile', status: 'Sick Leave', color: 'glassy-purple' },
                            { name: 'Mike Rodriguez', icon: 'profile', status: 'Vacation', color: 'glassy-blue' },
                            { name: 'John Davis', icon: 'profile', status: 'Personal', color: 'glassy-green' },
                            { name: 'Emma Wilson', icon: 'profile', status: 'Travel', color: 'glassy-orange' },
                        ].map((person, idx) => (
                            <div key={idx} className="team-member-card">
                                <div className={`team-avatar glassy-icon-base ${person.color}`}>
                                    <Icon name={person.icon as any} size={20} />
                                </div>
                                <div className="team-member-info">
                                    <div className="team-member-name">{person.name}</div>
                                    <div className="team-member-status">{person.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Link to="/leaves" className="section-footer-link">
                        <span>View full calendar</span>
                        <Icon name="arrow_forward" size={16} />
                    </Link>
                </div>

                {/* Announcements Section */}
                <div className="dashboard-section announcements-section">
                    <div className="section-header-premium">
                        <div className="section-icon-badge glassy-icon-base glassy-blue">
                            <Icon name="notifications" size={20} />
                        </div>
                        <div className="flex-1">
                            <h2 className="section-title-premium">Announcements</h2>
                            <p className="section-subtitle-premium">Latest updates</p>
                        </div>
                        {notifications.length > 0 && (
                            <span className="notification-count-badge">{notifications.length}</span>
                        )}
                    </div>

                    <div className="announcements-list-premium">
                        {notifications.length > 0 ? (
                            notifications.slice(0, 4).map(n => (
                                <div key={n.id} className="announcement-card-premium">
                                    <div className="announcement-icon">
                                        <Icon name="campaign" size={20} />
                                    </div>
                                    <div className="announcement-content">
                                        <div className="announcement-message">{n.message}</div>
                                        <div className="announcement-time">
                                            {new Date(n.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state-premium">
                                <div className="empty-state-icon">
                                    <Icon name="check_circle" size={48} />
                                </div>
                                <div className="empty-state-title">All caught up!</div>
                                <div className="empty-state-text">No new announcements at the moment.</div>
                            </div>
                        )}
                    </div>

                    {notifications.length > 4 && (
                        <Link to="/notifications" className="section-footer-link">
                            <span>View all announcements</span>
                            <Icon name="arrow_forward" size={16} />
                        </Link>
                    )}
                </div>

                {/* Performance Snapshot - New Section */}
                <div className="dashboard-section performance-section">
                    <div className="section-header-premium">
                        <div className="section-icon-badge glassy-icon-base glassy-orange">
                            <Icon name="trending_up" size={20} />
                        </div>
                        <h2 className="section-title-premium">Your Performance</h2>
                    </div>

                    <div className="performance-metrics">
                        <div className="metric-item">
                            <div className="metric-label">Attendance Rate</div>
                            <div className="metric-value-row">
                                <div className="metric-value">96%</div>
                                <div className="metric-trend positive">+2%</div>
                            </div>
                            <div className="metric-bar">
                                <div className="performance-bar-fill bg-success w-[96%]"></div>
                            </div>
                        </div>
                        <div className="metric-item">
                            <div className="metric-label">Tasks Completed</div>
                            <div className="metric-value-row">
                                <div className="metric-value">24/30</div>
                                <div className="metric-trend positive">+5</div>
                            </div>
                            <div className="metric-bar">
                                <div className="performance-bar-fill bg-primary w-[80%]"></div>
                            </div>
                        </div>
                    </div>

                    <Link to="/performance" className="section-footer-link">
                        <span>View detailed report</span>
                        <Icon name="arrow_forward" size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;