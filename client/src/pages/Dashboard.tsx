import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { StatsCardPremium, WidgetHeader } from '../components/ui/DashboardElements';
import { Avatar } from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import { AttendanceWidget } from '../components/dashboard/AttendanceWidget';

interface DashboardStats {
    users?: { total: number; active: number };
    attendance?: { presentToday: number };
    recruitment?: { openJobs: number };
    finance?: { pendingClaims: number };
    whoIsOut?: { name: string; role: string; status: string; color: string }[];
    birthdays?: { name: string; date: string; photo: string }[];
}

interface Notification {
    id: string;
    message: string;
    date: string;
    type?: 'info' | 'warning' | 'success';
}

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await api.get<DashboardStats>('/stats');
                setStats(data);
            } catch (error) {
                console.error("Stats error", error);
            }
        };

        const fetchNotifications = async () => {
            try {
                const data = await api.get<Notification[]>('/notifications');
                setNotifications(data || []);
            } catch (error) {
                console.error(error);
                setNotifications([]);
            }
        };

        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchStats(), fetchNotifications()]);
            setLoading(false);
        };
        loadData();

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [user]);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} height={140} variant="rounded" className="w-full rounded-3xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton height={300} variant="rounded" className="lg:col-span-2 rounded-3xl" />
                    <Skeleton height={300} variant="rounded" className="rounded-3xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">

            {/* Greeting & Date */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">
                        Good Morning, {user?.profile?.firstName || 'User'}! 👋
                    </h1>
                    <p className="text-[var(--text-muted)] mt-1">Here's what's happening at Citrux today.</p>
                </div>
                <div className="text-right hidden md:block">
                    <div className="text-2xl font-bold font-mono text-[var(--text-main)]">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-sm text-[var(--text-muted)] font-medium">
                        {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Stats Grid - Pastel Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCardPremium
                    title="Total Employees"
                    value={stats?.users?.total || 0}
                    subtext="12 New this month"
                    icon="employees"
                    variant="purple"
                    trend="+12%"
                />
                <StatsCardPremium
                    title="On Time Today"
                    value={stats?.attendance?.presentToday || 0}
                    subtext="96% Attendance Rate"
                    icon="attendance"
                    variant="green"
                />
                <StatsCardPremium
                    title="Pending Claims"
                    value={stats?.finance?.pendingClaims || 0}
                    subtext="Requires Approval"
                    icon="expenses"
                    variant="orange"
                    trend="+5"
                />
                <StatsCardPremium
                    title="Open Jobs"
                    value={stats?.recruitment?.openJobs || 0}
                    subtext="Active Campaigns"
                    icon="careers"
                    variant="blue"
                />
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Left Column: Charts & Activity */}
                <div className="xl:col-span-2 space-y-8">

                    {/* Work Format / Charts Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Work Format Chart Placeholder */}
                        <div className="bg-[var(--bg-surface)] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center min-h-[300px]">
                            <h3 className="text-lg font-bold mb-6 w-full text-left text-[var(--text-main)]">Work Format</h3>
                            <div className="relative w-48 h-48">
                                {/* Simulated Donut Chart */}
                                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                    {/* Office - Green */}
                                    <path className="text-[var(--primary)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8" strokeDasharray="60, 100" />
                                    {/* Remote - Purple */}
                                    <path className="text-purple-300" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8" strokeDasharray="25, 100" strokeDashoffset="-60" />
                                    {/* Hybrid - Blue */}
                                    <path className="text-blue-200" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8" strokeDasharray="15, 100" strokeDashoffset="-85" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold text-[var(--text-main)]">{stats?.users?.total || 0}</span>
                                    <span className="text-xs text-[var(--text-muted)]">Total</span>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                                    <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span> Office
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                                    <span className="w-2 h-2 rounded-full bg-purple-300"></span> Remote
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                                    <span className="w-2 h-2 rounded-full bg-blue-200"></span> Hybrid
                                </div>
                            </div>
                        </div>

                        {/* Recruitment / Activity */}
                        <div className="bg-[var(--bg-surface)] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col min-h-[300px]">
                            <WidgetHeader title="Recruitment" icon="careers" />
                            <div className="flex-1 flex flex-col gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-[var(--text-main)]">Senior UX Designer</span>
                                        <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold px-2 py-1 rounded-md">ACTIVE</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-3">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white dark:border-slate-800"></div>)}
                                        </div>
                                        <span>12 Candidates</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-[var(--text-main)]">Marketing Manager</span>
                                        <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] font-bold px-2 py-1 rounded-md">INTERVIEW</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-3">
                                        <span>5 Candidates in Pipeline</span>
                                    </div>
                                </div>
                            </div>
                            <Link to="/recruitment/jobs" className="mt-4 text-center text-sm font-bold text-[var(--text-main)] hover:text-[var(--primary)] transition-colors">View All Openings</Link>
                        </div>
                    </div>

                    {/* Employee Table Preview */}
                    <div className="bg-[var(--bg-surface)] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <WidgetHeader title="My Team" icon="employees" action={<Link to="/users" className="text-xs font-bold text-[var(--primary)] hover:underline">View All</Link>} />
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-xs text-[var(--text-muted)] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="pb-3 pl-2">Employee</th>
                                        <th className="pb-3 text-center">Status</th>
                                        <th className="pb-3 text-right">Role</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {[1, 2, 3].map((_, i) => (
                                        <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-b border-transparent">
                                            <td className="py-3 pl-2">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={`User ${i}`} size="32px" />
                                                    <span className="font-semibold text-[var(--text-main)]">Employee Name</span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-center">
                                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                                            </td>
                                            <td className="py-3 text-right text-[var(--text-muted)]">Product Designer</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* Right Column: Widgets */}
                <div className="space-y-8">

                    {/* Attendance Widget - New */}
                    <AttendanceWidget />

                    {/* Who's Out Widget - Matches Reference Yellow Box */}
                    <div className="bg-[#FFFBEB] dark:bg-amber-950/30 p-6 rounded-[2rem] relative overflow-hidden h-full flex flex-col border border-transparent dark:border-amber-900/30">
                        {/* Blob decor - simplified */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 dark:bg-amber-900/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-black/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                <Icon name="leaves" size={20} />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-orange-100 tracking-tight">Who's Out</h3>
                        </div>

                        <div className="flex-1 space-y-3 relative z-10">
                            {stats?.whoIsOut && stats.whoIsOut.length > 0 ? (
                                stats.whoIsOut.map((person, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-white/80 dark:bg-black/30 p-3 rounded-2xl backdrop-blur-sm shadow-sm border border-orange-100/50 dark:border-amber-900/50">
                                        <Avatar name={person.name} size="40px" />
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-slate-800 dark:text-orange-50">{person.name}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-wide opacity-60 text-slate-600 dark:text-orange-200">{person.role}</div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${person.status === 'Sick' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200'
                                            }`}>{person.status}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                    <div className="text-4xl mb-2">☀️</div>
                                    <p className="font-bold text-orange-900/70 dark:text-orange-200/70">Everyone is in today!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Announcements */}
                    <div className="bg-[var(--bg-surface)] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 h-full">
                        <WidgetHeader title="Announcements" icon="campaign" />
                        <div className="space-y-4">
                            {notifications.length > 0 ? notifications.slice(0, 3).map((n, i) => (
                                <div key={i} className="flex gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                                    <div className="mt-1 w-2 h-2 rounded-full bg-[var(--primary)] flex-shrink-0"></div>
                                    <div>
                                        <p className="text-sm font-medium leading-snug">{n.message}</p>
                                        <span className="text-[10px] text-[var(--text-muted)] mt-1 block">{new Date(n.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-6 text-[var(--text-muted)]">No new announcements</div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;