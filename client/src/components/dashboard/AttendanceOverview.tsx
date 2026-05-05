import React from 'react';
import { Icon } from '../ui/Icons';
import { Avatar } from '../ui/Avatar';
import { useDashboard } from '../../hooks/useDashboard';
import { buildTodaySummary } from '../../services/dashboard.service';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../ui/Skeleton';
import { useNavigate } from 'react-router-dom';

const METRIC_TILES = [
    {
        key: 'present' as const,
        label: 'Present',
        color: 'bg-emerald-500',
        iconColor: 'shadow-emerald-200',
        icon: 'check_circle' as const,
    },
    {
        key: 'absent' as const,
        label: 'Absent',
        color: 'bg-rose-500',
        iconColor: 'shadow-rose-200',
        icon: 'close' as const,
    },
    {
        key: 'onLeave' as const,
        label: 'On Leave',
        color: 'bg-indigo-500',
        iconColor: 'shadow-indigo-200',
        icon: 'event' as const,
    },
    {
        key: 'late' as const,
        label: 'Late',
        color: 'bg-amber-500',
        iconColor: 'shadow-amber-200',
        icon: 'schedule' as const,
    },
] as const;

export const AttendanceOverview: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { stats, loading } = useDashboard();

    const isManagerOrAbove = user?.role
        ? ['ADMIN', 'HR', 'SUPER_ADMIN', 'MANAGER'].includes(user.role.toUpperCase())
        : false;

    const summary = React.useMemo(
        () => (stats ? buildTodaySummary(stats) : null),
        [stats]
    );

    // Who is out today (from DB-resolved leave records)
    const whoIsOut = stats?.whoIsOut ?? [];

    if (loading) {
        return (
            <div className="card-premium p-6 h-full flex flex-col bg-white space-y-4">
                <Skeleton height={28} variant="rounded" className="w-44" />
                <div className="grid grid-cols-2 gap-4 flex-1">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} height={90} variant="rounded" className="rounded-2xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="card-premium p-6 h-full flex flex-col bg-white">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-800">Today's Overview</h3>
                    <p className="text-xs text-slate-500 font-medium">
                        {isManagerOrAbove
                            ? `${summary?.total ?? 0} total headcount`
                            : 'Headcount & attendance'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/attendance')}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                >
                    View All
                </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4 flex-1">
                {METRIC_TILES.map((tile) => {
                    const count = summary ? summary[tile.key] : 0;
                    return (
                        <div
                            key={tile.label}
                            className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center group hover:bg-white hover:shadow-md transition-all"
                        >
                            <div
                                className={`p-2 rounded-xl ${tile.color} text-white mb-2 shadow-lg ${tile.iconColor} group-hover:scale-110 transition-transform`}
                            >
                                <Icon name={tile.icon} size={16} />
                            </div>
                            <span className="text-2xl font-black text-slate-800 tracking-tighter">
                                {count}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {tile.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Who's out today */}
            <div className="mt-6">
                {whoIsOut.length === 0 ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            No absences today 🎉
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                        <div className="flex -space-x-2">
                            {whoIsOut.slice(0, 3).map((person, i) => (
                                <div
                                    key={i}
                                    title={`${person.name} — ${person.status}`}
                                    className="w-6 h-6 rounded-full border-2 border-white"
                                >
                                    <Avatar name={person.name} size="24px" />
                                </div>
                            ))}
                            {whoIsOut.length > 3 && (
                                <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                    +{whoIsOut.length - 3}
                                </div>
                            )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            On Leave Today
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
