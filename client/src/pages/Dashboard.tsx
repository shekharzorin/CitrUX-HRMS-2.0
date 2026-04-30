import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { StatsCardPremium } from '../components/ui/DashboardElements';
import { Skeleton } from '../components/ui/Skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

// New Action-First Components
import { HeroWorkCard } from '../components/dashboard/HeroWorkCard';
import { ActionList } from '../components/dashboard/ActionList';
import { AttendanceOverview } from '../components/dashboard/AttendanceOverview';
import { TeamList } from '../components/dashboard/TeamList';
import { Icon } from '../components/ui/Icons';

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
}

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [showCharts, setShowCharts] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await api.get<DashboardStats>('/stats');
                setStats(data);
            } catch (error) {
                console.error("Stats error", error);
            }
        };

        const loadData = async () => {
            setLoading(true);
            await fetchStats();
            setLoading(false);
        };
        loadData();
    }, [user]);

    if (loading) {
        return (
            <div className="space-y-8 animate-pulse p-6">
                <Skeleton height={200} variant="rounded" className="w-full rounded-[2.5rem]" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} height={140} variant="rounded" className="w-full rounded-[2rem]" />)}
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

            {/* 1. HERO SECTION - Action Priority #1 */}
            <HeroWorkCard />

            {/* 2. METRICS ROW - Priority #3 */}
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
                    trend="↑ 2%"
                />
                <StatsCardPremium
                    title="Pending Approvals"
                    value={(stats?.finance?.pendingClaims || 0) + 3}
                    subtext="Leaves & Expenses"
                    icon="expenses"
                    variant="orange"
                    trend="3 URGENT"
                />
                <StatsCardPremium
                    title="Active Jobs"
                    value={stats?.recruitment?.openJobs || 0}
                    subtext="Hiring campaigns"
                    icon="careers"
                    variant="blue"
                    trend="2 NEW"
                />
            </div>

            {/* 3. CORE ACTIONS & OVERVIEW - Priority #2 & #4 */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Pending Actions */}
                <div className="xl:col-span-7">
                    <ActionList />
                </div>

                {/* Attendance Quick Stats */}
                <div className="xl:col-span-5">
                    <AttendanceOverview />
                </div>
            </div>

            {/* 4. INSIGHTS (CHARTS) - Priority #4 (Deprioritized) */}
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
                        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-[350px] flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-700">Attendance Trend</h3>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        <span className="text-[10px] font-bold text-slate-400">Present</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 w-full -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                            cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                                        />
                                        <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-[350px] flex flex-col">
                            <h3 className="font-bold text-slate-700 mb-6">Leave Distribution</h3>
                            <div className="flex-1 w-full -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={leaveTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                            cursor={{ fill: '#f8fafc' }}
                                        />
                                        <Bar dataKey="CL" name="Casual" stackId="a" fill="#6366f1" radius={[0, 0, 4, 4]} barSize={24} />
                                        <Bar dataKey="SL" name="Sick" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 5. TEAM SECTION - Secondary Data */}
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