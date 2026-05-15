import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { StatsCardPremium } from '../components/ui/DashboardElements';
import { Skeleton } from '../components/ui/Skeleton';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

// Dashboard sub-components
import { HeroWorkCard } from '../components/dashboard/HeroWorkCard';
import { ActionList } from '../components/dashboard/ActionList';
import { AttendanceOverview } from '../components/dashboard/AttendanceOverview';
import { TeamList } from '../components/dashboard/TeamList';
import { Icon } from '../components/ui/Icons';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { stats, loading, lastUpdated } = useDashboard();
    const [showCharts, setShowCharts] = useState(true);

    const isAdminOrHR = user?.role
        ? ['ADMIN', 'HR', 'SUPER_ADMIN'].includes(user.role.toUpperCase())
        : false;

    const isManagerOrAbove = user?.role
        ? ['ADMIN', 'HR', 'SUPER_ADMIN', 'MANAGER'].includes(user.role.toUpperCase())
        : false;

    // ── Metrics card computed values ─────────────────────────────────────────
    const totalEmployees = stats?.users?.total ?? 0;
    const activeEmployees = stats?.users?.active ?? 0;
    const presentToday = stats?.attendance?.presentToday ?? 0;
    const pendingLeaves = stats?.pendingActions?.leaves?.length ?? 0;
    const pendingExpenses = stats?.pendingActions?.expenses?.length ?? 0;
    const openJobs = stats?.recruitment?.openJobs ?? 0;

    // Pending approvals = leaves + expenses
    const totalPending = pendingLeaves + pendingExpenses;
    const urgentCount = (stats?.pendingActions?.leaves ?? []).filter(l => {
        const diffDays = (Date.now() - new Date(l.startDate).getTime()) / 86_400_000;
        return diffDays >= 2;
    }).length;

    // Attendance rate
    const attendanceRate = activeEmployees > 0
        ? Math.round((presentToday / activeEmployees) * 100)
        : 0;

    // New employees this month (we don't have the breakdown from stats, so omit the hardcoded text)
    const newThisMonth = activeEmployees > 0
        ? `${activeEmployees} active of ${totalEmployees}`
        : 'No active employees';

    // ── Chart data from API ──────────────────────────────────────────────────
    const attendanceTrendData = stats?.attendanceTrend ?? [];
    const leaveTrendData = (stats?.leaveTrend ?? []).map(l => ({
        month: l.month,
        Approved: l.approved,
        Pending: l.pending,
    }));

    // ── Skeleton loading state ───────────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-8 animate-pulse p-6">
                <Skeleton height={200} variant="rounded" className="w-full rounded-[2.5rem]" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} height={140} variant="rounded" className="w-full rounded-[2rem]" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Skeleton height={400} variant="rounded" className="rounded-3xl" />
                    <Skeleton height={400} variant="rounded" className="rounded-3xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            <HeroWorkCard />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isAdminOrHR ? (
                    <>
                        <StatsCardPremium
                            title="Headcount"
                            value={totalEmployees}
                            subtext={newThisMonth}
                            icon="employees"
                            variant="purple"
                            trend="Organization"
                        />
                        <StatsCardPremium
                            title="Attendance"
                            value={`${attendanceRate}%`}
                            subtext={`${presentToday} present today`}
                            icon="attendance"
                            variant="green"
                            trend="Live"
                        />
                        <StatsCardPremium
                            title="Approvals"
                            value={totalPending}
                            subtext={`${pendingLeaves} leaves · ${pendingExpenses} exp`}
                            icon="expenses"
                            variant="orange"
                            trend={urgentCount > 0 ? `${urgentCount} Urgent` : 'Pending'}
                        />
                        <StatsCardPremium
                            title="Active Jobs"
                            value={openJobs}
                            subtext="Openings"
                            icon="careers"
                            variant="blue"
                            trend="Recruiting"
                        />
                    </>
                ) : isManagerOrAbove ? (
                    <>
                        <StatsCardPremium
                            title="Team Members"
                            value={stats?.teamMembers?.length ?? 0}
                            subtext="Direct reports"
                            icon="employees"
                            variant="purple"
                        />
                        <StatsCardPremium
                            title="Attendance"
                            value={`${attendanceRate}%`}
                            subtext={`${presentToday} present`}
                            icon="attendance"
                            variant="green"
                        />
                        <StatsCardPremium
                            title="Pending"
                            value={pendingLeaves}
                            subtext="Leave requests"
                            icon="expenses"
                            variant="orange"
                        />
                        <StatsCardPremium
                            title="Active Jobs"
                            value={openJobs}
                            subtext="Open positions"
                            icon="careers"
                            variant="blue"
                        />
                    </>
                ) : (
                    <>
                        <StatsCardPremium
                            title="Attendance"
                            value={stats?.personalStats?.daysThisMonth ?? 0}
                            subtext="Days this month"
                            icon="attendance"
                            variant="green"
                        />
                        <StatsCardPremium
                            title="Work Hours"
                            value={`${stats?.personalStats?.hoursThisMonth ?? 0}h`}
                            subtext="Monthly total"
                            icon="schedule"
                            variant="blue"
                        />
                        <StatsCardPremium
                            title="Late Days"
                            value={stats?.personalStats?.lateDays ?? 0}
                            subtext="Improve attendance"
                            icon="warning"
                            variant="orange"
                        />
                        <StatsCardPremium
                            title="Careers"
                            value={openJobs}
                            subtext="Internal openings"
                            icon="careers"
                            variant="purple"
                        />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7">
                    <ActionList />
                </div>
                <div className="lg:col-span-5">
                    <AttendanceOverview />
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                            <Icon name="analytics" size={16} />
                        </div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Business Intelligence</h2>
                    </div>
                    <button
                        onClick={() => setShowCharts(!showCharts)}
                        className="text-[11px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                    >
                        {showCharts ? 'Hide Details' : 'Show Details'}
                    </button>
                </div>

                {showCharts && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up">
                        <div className="lg:col-span-7 card-premium p-6 h-[380px] flex flex-col">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">Attendance Trend</h3>
                                    <p className="text-[10px] text-slate-400 font-medium mt-1">Last 7 days presence</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Present</span>
                                    </div>
                                </div>
                            </div>
                            {attendanceTrendData.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                    No data available
                                </div>
                            ) : (
                                <div className="flex-1 w-full -ml-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="day"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                                                allowDecimals={false}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold'
                                                }}
                                                cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="present"
                                                stroke="#10b981"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorPresent)"
                                                activeDot={{ r: 4, strokeWidth: 0 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5 card-premium p-6 h-[380px] flex flex-col">
                            <div className="mb-8">
                                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">Leave Distribution</h3>
                                <p className="text-[10px] text-slate-400 font-medium mt-1">Monthly requests breakdown</p>
                            </div>
                            {leaveTrendData.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                    No data available
                                </div>
                            ) : (
                                <div className="flex-1 w-full -ml-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={leaveTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="month"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                                                allowDecimals={false}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold'
                                                }}
                                                cursor={{ fill: '#f8fafc' }}
                                            />
                                            <Bar dataKey="Approved" stackId="a" fill="#6366f1" radius={[0, 0, 4, 4]} barSize={20} />
                                            <Bar dataKey="Pending" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <Icon name="employees" size={16} />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">People Directory</h2>
                </div>
                <TeamList />
            </div>
        </div>
    );
};

export default Dashboard;