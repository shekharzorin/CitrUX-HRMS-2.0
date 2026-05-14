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
        <div className="space-y-10 pb-12 animate-fade-in">

            {/* 1. HERO SECTION — Real clock-in state, real user name, real shift */}
            <HeroWorkCard />

            {/* Last updated indicator */}
            {lastUpdated && (
                <p className="text-[10px] text-slate-800 text-right -mt-6 pr-2 font-bold uppercase tracking-wider">
                    Data refreshed at {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            )}

            {/* 2. METRICS CARDS — All values from DB via /stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isAdminOrHR ? (
                    <>
                        <StatsCardPremium
                            title="Total Employees"
                            value={totalEmployees}
                            subtext={newThisMonth}
                            icon="employees"
                            variant="purple"
                            trend={`${activeEmployees} active`}
                        />
                        <StatsCardPremium
                            title="Present Today"
                            value={presentToday}
                            subtext={`${attendanceRate}% attendance rate`}
                            icon="attendance"
                            variant="green"
                            trend={attendanceRate > 90 ? '↑ Strong' : attendanceRate > 75 ? '→ Normal' : '↓ Low'}
                        />
                        <StatsCardPremium
                            title="Pending Approvals"
                            value={totalPending}
                            subtext={`${pendingLeaves} leave · ${pendingExpenses} expense`}
                            icon="expenses"
                            variant="orange"
                            trend={urgentCount > 0 ? `${urgentCount} URGENT` : 'All normal'}
                        />
                        <StatsCardPremium
                            title="Active Jobs"
                            value={openJobs}
                            subtext="Open positions"
                            icon="careers"
                            variant="blue"
                            trend={openJobs > 0 ? 'Hiring' : 'No openings'}
                        />
                    </>
                ) : isManagerOrAbove ? (
                    <>
                        <StatsCardPremium
                            title="Team Size"
                            value={stats?.teamMembers?.length ?? 0}
                            subtext="Direct reports"
                            icon="employees"
                            variant="purple"
                            trend="My team"
                        />
                        <StatsCardPremium
                            title="Present Today"
                            value={presentToday}
                            subtext={`${attendanceRate}% of team`}
                            icon="attendance"
                            variant="green"
                            trend={attendanceRate > 90 ? '↑ Strong' : '→ Normal'}
                        />
                        <StatsCardPremium
                            title="Pending Leaves"
                            value={pendingLeaves}
                            subtext="Awaiting approval"
                            icon="expenses"
                            variant="orange"
                            trend={urgentCount > 0 ? `${urgentCount} URGENT` : 'On track'}
                        />
                        <StatsCardPremium
                            title="Active Jobs"
                            value={openJobs}
                            subtext="Open positions"
                            icon="careers"
                            variant="blue"
                            trend={openJobs > 0 ? 'Hiring' : 'No openings'}
                        />
                    </>
                ) : (
                    /* Employee view — personal stats */
                    <>
                        <StatsCardPremium
                            title="Days This Month"
                            value={stats?.personalStats?.daysThisMonth ?? 0}
                            subtext="Days attended"
                            icon="attendance"
                            variant="green"
                            trend="This month"
                        />
                        <StatsCardPremium
                            title="Hours Logged"
                            value={`${stats?.personalStats?.hoursThisMonth ?? 0}h`}
                            subtext="This month"
                            icon="schedule"
                            variant="blue"
                            trend="Work hours"
                        />
                        <StatsCardPremium
                            title="Late Days"
                            value={stats?.personalStats?.lateDays ?? 0}
                            subtext="This month"
                            icon="warning"
                            variant="orange"
                            trend={stats?.personalStats?.lateDays === 0 ? 'Perfect!' : 'Improve'}
                        />
                        <StatsCardPremium
                            title="Active Jobs"
                            value={openJobs}
                            subtext="Internal openings"
                            icon="careers"
                            variant="purple"
                            trend="Refer someone"
                        />
                    </>
                )}
            </div>

            {/* 3. ACTION LIST + ATTENDANCE OVERVIEW */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-7">
                    <ActionList />
                </div>
                <div className="xl:col-span-5">
                    <AttendanceOverview />
                </div>
            </div>

            {/* 4. BUSINESS INSIGHTS — Real 7-day attendance trend + leave distribution */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Icon name="analytics" size={18} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800">Business Insights</h2>
                    </div>
                    <button
                        onClick={() => setShowCharts(!showCharts)}
                        className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                    >
                        {showCharts ? 'Minimize' : 'Expand'}
                        <Icon name={showCharts ? 'chevron_up' : 'chevron_down'} size={14} />
                    </button>
                </div>

                {showCharts && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up">
                        {/* Attendance Trend — last 7 days from DB */}
                        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-[350px] flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-700">Attendance Trend</h3>
                                    <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">Last 7 days</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-bold text-slate-600">Present</span>
                                </div>
                            </div>
                            {attendanceTrendData.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-semibold">
                                    No attendance records found
                                </div>
                            ) : (
                                <div className="flex-1 w-full -ml-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
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
                                                    borderRadius: '16px',
                                                    border: 'none',
                                                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                                }}
                                                cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                                                formatter={(v: any) => [`${v} people`, 'Present']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="present"
                                                stroke="#10b981"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorPresent)"
                                                activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* Leave Distribution — last 4 months from DB */}
                        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-[350px] flex flex-col">
                            <div className="mb-6">
                                <h3 className="font-bold text-slate-700">Leave Distribution</h3>
                                <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">Last 4 months</p>
                            </div>
                            {leaveTrendData.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-semibold">
                                    No leave records found
                                </div>
                            ) : (
                                <div className="flex-1 w-full -ml-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={leaveTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                                                    borderRadius: '16px',
                                                    border: 'none',
                                                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                                }}
                                                cursor={{ fill: '#f8fafc' }}
                                            />
                                            <Legend
                                                iconType="circle"
                                                iconSize={8}
                                                wrapperStyle={{ fontSize: '10px', fontWeight: 700 }}
                                            />
                                            <Bar
                                                dataKey="Approved"
                                                stackId="a"
                                                fill="#6366f1"
                                                radius={[0, 0, 4, 4]}
                                                barSize={24}
                                            />
                                            <Bar
                                                dataKey="Pending"
                                                stackId="a"
                                                fill="#f59e0b"
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 5. TEAM VISIBILITY */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Icon name="employees" size={18} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800">Team Visibility</h2>
                </div>
                <TeamList />
            </div>

        </div>
    );
};

export default Dashboard;