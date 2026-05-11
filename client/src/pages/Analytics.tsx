import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { StatBox, WidgetHeader } from '../components/ui/DashboardElements';
import { EmptyState } from '../components/ui/EmptyState';

const Analytics: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const data = await api.get<any>('/stats');
            setStats(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
    );

    if (!stats) return <EmptyState title="No Data" description="Unable to load analytics data." icon="analytics" />;

    return (
        <div className="space-y-8 pb-12">

            {/* Hero Section */}
            <div className="page-hero-premium bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-900">
                <div className="page-hero-pattern"></div>
                <div className="page-hero-content">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-medium text-cyan-100 mb-6 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.5)]"></span>
                            Real-time Insights
                        </div>
                        <h1 className="page-hero-title">Analytics Dashboard</h1>
                        <p className="page-hero-subtitle text-cyan-100/80 max-w-xl">
                            Monitor key performance indicators, workforce trends, and operational metrics across your organization.
                        </p>
                    </div>
                    <div className="page-hero-icon text-cyan-200 bg-cyan-500/10">
                        <Icon name="analytics" size={32} />
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xl font-bold text-[var(--text-main)]">Key Metrics</h2>
                    <div className="text-sm text-[var(--text-muted)]">Snapshot for today</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatBox
                        label="Total Workforce"
                        value={stats.users?.total || 0}
                        sub={`${stats.users?.active || 0} Active Users`}
                        icon="employees"
                        color="text-indigo-600 dark:text-indigo-400"
                        className="cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-800"
                    />
                    <StatBox
                        label="Attendance Rate"
                        value={stats.attendance?.presentToday || 0}
                        sub="Present Today"
                        icon="attendance"
                        color="text-emerald-600 dark:text-emerald-400"
                        className="cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-800"
                    />
                    <StatBox
                        label="Pending Expenses"
                        value={stats.finance?.pendingClaims || 0}
                        sub={`₹${stats.finance?.approvedTotal || 0} Approved`}
                        icon="expenses"
                        color="text-amber-500 dark:text-amber-400"
                        className="cursor-pointer hover:border-amber-200 dark:hover:border-amber-800"
                    />
                    <StatBox
                        label="Hiring Pipeline"
                        value={stats.recruitment?.openJobs || 0}
                        sub="Open Positions"
                        icon="careers"
                        color="text-rose-500 dark:text-rose-400"
                        className="cursor-pointer hover:border-rose-200 dark:hover:border-rose-800"
                    />
                </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <StatBox
                    label="Asset Utilization"
                    value={stats.assets?.assigned || 0}
                    sub="Devices Assigned"
                    icon="assets"
                    color="text-blue-500 dark:text-blue-400"
                />
                {/* Placeholder for future specific stats if available, otherwise generic placeholders */}
                <div className="lg:col-span-2 card-premium p-6 flex flex-col justify-center items-center text-center space-y-2 opacity-70 border-dashed border-2 border-slate-200 dark:border-slate-700">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                        <Icon name="trending_up" size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-main)]">More Insights Coming Soon</h3>
                    <p className="text-xs text-[var(--text-muted)]">We are gathering more data to show you trends.</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="space-y-4 pt-4">
                <h2 className="text-xl font-bold text-[var(--text-main)] px-1">Deep Dive</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Expense Trends */}
                    <div className="card-premium p-8 min-h-[300px] flex flex-col">
                        <WidgetHeader title="Expense Trends" className="w-full mb-4" icon="expenses" />
                        <div className="flex-1 flex items-end justify-between space-x-2 pt-4 px-2">
                            {stats.finance?.trend?.length > 0 ? (
                                stats.finance.trend.map((t: any, idx: number) => {
                                    const maxVal = Math.max(...stats.finance.trend.map((i: any) => i.amount)) || 1;
                                    const heightPct = (t.amount / maxVal) * 100;
                                    return (
                                        <div key={idx} className="flex flex-col items-center flex-1 group">
                                            <div className="w-full relative flex items-end justify-center h-40 bg-slate-50 rounded-t-lg overflow-hidden">
                                                {/* eslint-disable-next-line */}
                                                <div
                                                    style={{ height: `${heightPct}%` }}
                                                    className="w-full md:w-8 bg-gradient-to-t from-amber-500 to-amber-300 opacity-80 group-hover:opacity-100 transition-all rounded-t-md"
                                                ></div>
                                            </div>
                                            <div className="text-xs font-bold text-slate-500 mt-2">{t.month}</div>
                                            <div className="text-[10px] font-mono text-slate-400">₹{t.amount > 1000 ? (t.amount / 1000).toFixed(1) + 'k' : t.amount}</div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="w-full text-center text-slate-400 py-10">No expense data available</div>
                            )}
                        </div>
                    </div>

                    {/* Department Headcount */}
                    <div className="card-premium p-8 min-h-[300px] flex flex-col">
                        <WidgetHeader title="Department Headcount" className="w-full mb-4" icon="departments" />
                        <div className="flex-1 space-y-4 pt-2">
                            {stats.departments && stats.departments.length > 0 ? (
                                stats.departments.map((dept: any, idx: number) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span className="text-slate-700">{dept.name || 'Unassigned'}</span>
                                            <span className="text-slate-900 font-bold">{dept.count}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                style={{ width: `${(dept.count / stats.users?.total) * 100}%` }}
                                                className={`h-2.5 rounded-full ${['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-cyan-500', 'bg-amber-500'][idx % 5]}`}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-50">
                                    <Icon name="org_chart" size={48} className="text-slate-300" />
                                    <div className="text-sm text-[var(--text-muted)]">No department data available.</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
