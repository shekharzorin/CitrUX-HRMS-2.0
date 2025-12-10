import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Analytics: React.FC = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/stats', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setStats(await res.json());
        } catch (error) { console.error(error); }
    };

    if (!stats) return <div className="p-6">Loading Analytics...</div>;

    const Card = ({ title, value, sub, color }: any) => (
        <div className={`p-6 rounded-xl shadow-sm border border-slate-200 bg-white`}>
            <div className="text-slate-500 text-sm font-bold uppercase mb-2">{title}</div>
            <div className={`text-4xl font-bold ${color}`}>{value}</div>
            {sub && <div className="text-slate-400 text-xs mt-2">{sub}</div>}
        </div>
    );

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">HR Analytics Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card title="Total Employees" value={stats.users.total} sub={`${stats.users.active} Active Users`} color="text-slate-800" />
                <Card title="Present Today" value={stats.attendance.presentToday || 0} sub="Check-ins recorded" color="text-green-600" />
                <Card title="Open Jobs" value={stats.recruitment.openJobs} sub="Role vacancies" color="text-blue-600" />
                <Card title="Pending Expenses" value={stats.finance.pendingClaims} sub={`$${stats.finance.approvedTotal} Approved YTD`} color="text-amber-600" />
                <Card title="Assigned Assets" value={stats.assets.assigned} sub="Devices in use" color="text-purple-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Placeholder for future charts */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-64 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-5xl mb-2">📊</div>
                        <div className="text-slate-500 font-bold">Expense Trends</div>
                        <div className="text-xs text-slate-400">(Coming Soon in v2.1)</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-64 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-5xl mb-2">🥧</div>
                        <div className="text-slate-500 font-bold">Dept Distribution</div>
                        <div className="text-xs text-slate-400">(Coming Soon in v2.1)</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
