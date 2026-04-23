import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { StatsCardPremium, WidgetHeader } from '../components/ui/DashboardElements';
import { Avatar } from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import { AttendanceWidget } from '../components/dashboard/AttendanceWidget';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const attendanceTrendData = [
  { day: 'Mon', present: 95, absent: 5 },
  { day: 'Tue', present: 98, absent: 2 },
  { day: 'Wed', present: 90, absent: 10 },
  { day: 'Thu', present: 99, absent: 1 },
  { day: 'Fri', present: 85, absent: 15 },
];

const leaveTrendData = [
  { month: 'Jan', CL: 12, SL: 5 },
  { month: 'Feb', CL: 8, SL: 10 },
  { month: 'Mar', CL: 15, SL: 2 },
  { month: 'Apr', CL: 5, SL: 1 },
];

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

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <div className="space-y-8 pb-12">

            {/* Greeting & Date */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">
                        {getGreeting()}, {user?.profile?.firstName || 'User'}! 👋
                    </h1>
                    <p className="text-[var(--text-muted)] mt-1">Here's what's happening at {user?.company?.name || 'Citrux'} today.</p>
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

            {/* Quick Actions */}
            {user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link to="/attendance" className="card-premium p-4 flex items-center gap-4 hover:shadow-lg transition-transform group">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                            <Icon name="attendance" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-[var(--text-main)]">Mark Attendance</h3>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Clock in or out</p>
                        </div>
                    </Link>
                    <Link to="/leaves" className="card-premium p-4 flex items-center gap-4 hover:shadow-lg transition-transform group">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                            <Icon name="leaves" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-[var(--text-main)]">Apply Leave</h3>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Request time off</p>
                        </div>
                    </Link>
                    <Link to="/expenses" className="card-premium p-4 flex items-center gap-4 hover:shadow-lg transition-transform group">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
                            <Icon name="expenses" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-[var(--text-main)]">Claim Expense</h3>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Submit a bill</p>
                        </div>
                    </Link>
                    <Link to="/payslips" className="card-premium p-4 flex items-center gap-4 hover:shadow-lg transition-transform group">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                            <Icon name="download" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-[var(--text-main)]">Payslips</h3>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">View & Download</p>
                        </div>
                    </Link>
                </div>
            )}

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
                        {/* Attendance Trend Chart */}
                        <div className="bg-[var(--bg-surface)] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col min-h-[300px]">
                            <WidgetHeader title="Attendance Trend" icon="attendance" />
                            <div className="flex-1 w-full mt-4 -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />
                                        <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Pending Actions */}
                        <div className="bg-[var(--bg-surface)] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col min-h-[300px]">
                            <WidgetHeader title="Action Required" icon="event" />
                            <div className="flex-1 flex flex-col gap-4 mt-2">
                                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-[var(--text-main)] mt-1">Leave Approval</span>
                                        <span className="bg-amber-200 text-amber-800 dark:bg-amber-800/40 dark:text-amber-300 text-[10px] font-bold px-2 py-1 rounded-md">URGENT</span>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mb-3">John Doe requested 2 days of Sick Leave.</p>
                                    <div className="flex gap-2">
                                        <button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 rounded-xl transition-colors">Approve</button>
                                        <button className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-bold py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">Details</button>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-[var(--text-main)] mt-1">Expense Claim</span>
                                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold px-2 py-1 rounded-md">PENDING</span>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mb-3">Server maintenance equipment - ₹12,500.</p>
                                    <div className="flex gap-2">
                                        <button className="flex-1 bg-[var(--primary)] hover:brightness-110 text-white text-xs font-bold py-2 rounded-xl transition-colors">Review Claim</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Leave Trends Chart - Spans full width */}
                    <div className="bg-[var(--bg-surface)] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <WidgetHeader title="Leave Trends (YTD)" icon="leaves" />
                        <div className="h-[250px] w-full mt-4 -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={leaveTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                    <Bar dataKey="CL" name="Casual Leave" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} barSize={32} />
                                    <Bar dataKey="SL" name="Sick Leave" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
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