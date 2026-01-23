import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Icon, type IconName } from '../components/ui/Icons';
import { StatBox, WidgetHeader } from '../components/ui/DashboardElements';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

interface DashboardStats {
    users?: { total: number; active: number };
    attendance?: { presentToday: number };
    recruitment?: { openJobs: number };
    finance?: { pendingClaims: number };
    // New fields
    whoIsOut?: { name: string; role: string; status: string; color: string }[];
    birthdays?: { name: string; date: string; photo: string }[];
}

interface Notification {
    id: string;
    message: string;
    date: string;
    type?: 'info' | 'warning' | 'success';
}

// --- Helper Components ---

const QuickAction = ({ to, label, icon, color }: { to: string; label: string; icon: IconName; color: string }) => (
    <Link to={to} className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-white dark:bg-slate-800 border border-[var(--border-light)] hover:border-indigo-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
        <div className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center text-white shadow-lg ${color} group-hover:scale-110 transition-transform duration-300`}>
            <Icon name={icon} size={28} />
        </div>
        <span className="text-sm font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">{label}</span>
    </Link>
);

import { useAttendanceWidget } from '../hooks/useAttendanceWidget';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [userShift, setUserShift] = useState<any>(null); // { name, startTime, endTime }

    const { clockedIn, workDuration, clockingLoading, handleClockIn, refreshAttendance } = useAttendanceWidget();

    useEffect(() => {
        // Refresh attendance when user changes (e.g. login/logout)
        refreshAttendance();
    }, [user, refreshAttendance]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Now accessible to all, but returns different data based on role
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

        const fetchLeaveBalances = async () => {
            try {
                const data = await api.get<any[]>('/leaves/my-balances');
                setLeaveBalances(data || []);
            } catch (error) {
                console.error(error);
            }
        };

        // fetchAttendanceStatus is now outer scope

        const fetchUserProfile = async () => {
            if (user?.id) {
                try {
                    const profile = await api.get<any>(`/users/${user.id}`);
                    if (profile.shift) {
                        setUserShift(profile.shift);
                    }
                } catch (e) { console.error("Failed to fetch shift info", e); }
            }
        };

        const loadData = async () => {
            setLoading(true);
            await Promise.all([
                fetchStats(),
                fetchNotifications(),
                fetchLeaveBalances(),
                fetchUserProfile()
            ]);
            setLoading(false);
        };
        loadData();

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [user]);

    if (loading) {
        return (
            <div className="space-y-8 pb-12 animate-pulse">
                {/* Hero Skeleton */}
                <div className="h-64 rounded-[40px] bg-slate-200 dark:bg-slate-800 w-full mb-8"></div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 space-y-8">
                        {/* Quick Access Skeleton */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} height={120} variant="rounded" className="w-full" />)}
                        </div>

                        {/* Stats Skeleton */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} height={100} variant="rounded" className="w-full" />)}
                        </div>

                        {/* Widgets Skeleton */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Skeleton height={300} variant="rounded" className="w-full" />
                            <Skeleton height={300} variant="rounded" className="w-full" />
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Right Sidebar Skeletons */}
                        <Skeleton height={250} variant="rounded" className="w-full" />
                        <Skeleton height={300} variant="rounded" className="w-full" />
                    </div>
                </div>
            </div>
        );
    }

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    return (
        <div className="space-y-8 pb-12">

            {/* Hero Section */}
            <div className="page-hero-premium bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900">
                <div className="page-hero-pattern"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-medium text-indigo-100 mb-6 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                            Online • Work From Office
                        </div>
                        <h1 className="font-heading mb-4 tracking-tight">
                            <span className="block text-xl md:text-2xl font-medium text-indigo-200 mb-1 opacity-90">{getGreeting()},</span>
                            <span className="text-3xl md:text-5xl font-bold text-white drop-shadow-sm">{user?.profile?.firstName || 'User'}</span>
                        </h1>
                        <p className="text-indigo-100/80 text-base md:text-lg max-w-xl font-normal leading-relaxed">
                            Here's what's happening in your organization today.
                        </p>
                    </div>

                    <div className="flex items-center gap-6 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg shadow-black/5">
                        <div className="text-right hidden sm:block p-1">
                            <div className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-1 opacity-80">Current Time</div>
                            <div className="text-3xl font-mono font-bold tracking-widest text-white drop-shadow-sm">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-xs text-indigo-200 font-medium mt-1">
                                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                        <div className="h-12 w-[1px] bg-white/10 hidden sm:block"></div>
                        <div className="flex flex-col items-center gap-1">
                            <Button
                                className={`!bg-white !text-indigo-600 hover:!bg-indigo-50 !border-0 shadow-xl shadow-indigo-900/20 ring-4 ring-white/10 hover:ring-white/20 transition-all scale-100 hover:scale-[1.02] active:scale-[0.98] font-bold h-14 px-8 text-lg ${clockedIn ? '!text-rose-600 ring-rose-500/10' : ''} ${clockingLoading ? 'opacity-80 cursor-wait' : ''}`}
                                onClick={handleClockIn}
                                disabled={clockingLoading}
                            >
                                {clockingLoading ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-3"></div>
                                ) : (
                                    <Icon name={clockedIn ? "logout" : "attendance"} size={24} className="mr-2.5" />
                                )}
                                {clockingLoading ? "Processing..." : (clockedIn ? "Clock Out" : "Clock In")}
                            </Button>
                            {clockedIn ? (
                                <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-300 animate-pulse">
                                    Active: {workDuration}
                                </div>
                            ) : (
                                <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-200/60">
                                    {userShift ? `Shift: ${userShift.startTime} - ${userShift.endTime}` : 'No Shift Assigned'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* Left Column (3 cols wide) */}
                <div className="lg:col-span-3 space-y-8">

                    {/* Quick Access */}
                    <div>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h2 className="text-xl font-bold text-[var(--text-main)]">Quick Actions</h2>
                            <Button variant="ghost" size="sm" className="text-[var(--primary)]">Customize</Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <QuickAction to="/attendance" label="Time Clock" icon="schedule" color="bg-gradient-to-br from-blue-500 to-indigo-600" />
                            <QuickAction to="/leaves" label="Apply Leave" icon="event" color="bg-gradient-to-br from-emerald-400 to-teal-600" />
                            <QuickAction to="/expenses" label="Expenses" icon="expenses" color="bg-gradient-to-br from-orange-400 to-rose-500" />
                            <QuickAction to="/profile" label="My Profile" icon="profile" color="bg-gradient-to-br from-violet-500 to-purple-600" />
                        </div>
                    </div>

                    {/* Stats & Analytics */}
                    {(user?.role === 'ADMIN' || user?.role === 'HR') && stats && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-xl font-bold text-[var(--text-main)]">Organization Overview</h2>
                                <Button variant="ghost" size="sm" rightIcon={<Icon name="arrow_down" size={16} />}>Last 30 Days</Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatBox label="Total Employees" value={stats.users?.total || 0} sub="+2 this month" color="text-indigo-600 dark:text-indigo-400" icon="employees" />
                                <StatBox label="On Time Today" value={`${stats.attendance?.presentToday || 0}`} sub="96% Attendance" color="text-emerald-600 dark:text-emerald-400" icon="attendance" />
                                <StatBox label="Pending Claims" value={stats.finance?.pendingClaims || 0} sub="Needs Review" color="text-amber-500 dark:text-amber-400" icon="expenses" />
                                <StatBox label="Open Positions" value={stats.recruitment?.openJobs || 0} sub="actively hiring" color="text-rose-500 dark:text-rose-400" icon="careers" />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Attendance Chart Placeholder */}
                        <div className="card-premium p-6 h-full">
                            <WidgetHeader title="Attendance Trends" icon="trending_up" />
                            <EmptyState
                                title="No Data Available"
                                description="Attendance visualization will appear here once enough data is collected."
                                icon="analytics"
                                className="py-8"
                            />
                        </div>

                        {/* Team Status */}
                        <div className="card-premium p-6">
                            <WidgetHeader
                                title="Who's Out Today"
                                icon="team_leaves"
                                action={<Link to="/leaves" className="text-xs font-bold text-[var(--primary)] bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">View Calendar</Link>}
                            />
                            <div className="space-y-3">
                                {stats?.whoIsOut && stats.whoIsOut.length > 0 ? (
                                    stats.whoIsOut.map((person, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group">
                                            <Avatar name={person.name} size="40px" />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <div className="text-sm font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">{person.name}</div>
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${person.color || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                        {person.status}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)] font-medium">{person.role}</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-[var(--text-muted)] text-sm">
                                        No one is out today
                                    </div>
                                )}
                                <Button variant="ghost" fullWidth className="mt-2 text-xs text-[var(--text-muted)]">
                                    View all 5 absent employees
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar (1 col wide) */}
                <div className="space-y-8">

                    {/* Leave Balance Card */}
                    <div className="card-premium p-6 relative overflow-hidden group border border-[var(--border-light)]">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <WidgetHeader title="My Leaves" icon="leaves" action={<Link to="/leaves" className="btn-icon-sm"><Icon name="plus" size={18} /></Link>} />

                        <div className="space-y-4 relative z-10">
                            {leaveBalances.length > 0 ? (
                                leaveBalances.slice(0, 2).map((lb: any, i) => (
                                    <div key={i} className={`p-5 rounded-2xl ${i === 0 ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border border-[var(--border-light)]'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-sm font-medium ${i === 0 ? 'text-indigo-100' : 'text-[var(--text-muted)]'}`}>{lb.leaveType.name}</span>
                                            <Icon name="info" size={16} className={i === 0 ? "text-indigo-200" : "text-slate-300"} />
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-4xl font-bold ${i !== 0 && 'text-[var(--text-main)]'}`}>{lb.balance}</span>
                                            <span className={`text-sm ${i === 0 ? 'text-indigo-100' : 'text-[var(--text-muted)]'}`}>days left</span>
                                        </div>
                                        <div className={`mt-3 w-full rounded-full h-1.5 ${i === 0 ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                            <div className={`h-1.5 rounded-full ${i === 0 ? 'bg-white w-[75%]' : 'bg-emerald-500 w-[40%]'}`}></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-5 text-sm text-[var(--text-muted)]">No leave balance data</div>
                            )}
                        </div>
                    </div>

                    {/* Announcements / Feed */}
                    <div className="card-premium p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg text-[var(--text-main)]">Announcements</h3>
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                            </span>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {notifications.length > 0 ? (
                                notifications.slice(0, 5).map((n, i) => (
                                    <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group border border-transparent hover:border-[var(--border-light)]">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                                <Icon name="campaign" size={18} />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm text-[var(--text-main)] font-medium leading-relaxed group-hover:text-[var(--primary)] transition-colors">
                                                {n.message}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Icon name="schedule" size={12} className="text-[var(--text-muted)]" />
                                                <span className="text-xs text-[var(--text-muted)] font-medium">
                                                    {(() => {
                                                        const d = new Date(n.date);
                                                        return isNaN(d.getTime()) ? 'Date Unavailable' : d.toLocaleDateString();
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyState
                                    title="No Announcements"
                                    description="You're all caught up!"
                                    icon="campaign"
                                    className="py-6"
                                />
                            )}
                        </div>
                        <Button variant="outline" fullWidth className="mt-4">View All Updates</Button>
                    </div>

                    {/* Birthdays */}
                    <div className="card-premium p-6 bg-gradient-to-br from-rose-500 to-orange-500 text-white border-none shadow-xl shadow-rose-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-8 -mt-8"></div>

                        <div className="flex items-center gap-2 mb-4 relative z-10">
                            <span className="text-xl">🎉</span>
                            <h3 className="font-bold text-sm uppercase tracking-wide opacity-90">Celebrations</h3>
                        </div>

                        <div className="flex items-center gap-4 relative z-10">
                            {stats?.birthdays && stats.birthdays.length > 0 ? (
                                <>
                                    <div className="flex -space-x-3">
                                        {stats.birthdays.map((b, i) => (
                                            <Avatar key={i} name={b.name} src={b.photo} size="40px" className="border-2 border-white" />
                                        ))}
                                    </div>
                                    <div>
                                        <div className="font-bold text-base">{stats.birthdays.length} Birthdays</div>
                                        <div className="text-xs text-rose-100 font-medium">Coming up this week!</div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-sm text-white/80">No birthdays this week</div>
                            )}
                        </div>

                        <Button className="w-full mt-5 !bg-white/20 !border-white/20 backdrop-blur-sm !text-white hover:!bg-white/30 text-sm font-semibold h-9 shadow-lg">
                            Send Wishes
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;