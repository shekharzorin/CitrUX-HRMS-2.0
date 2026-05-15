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
        color: 'bg-emerald-50 text-emerald-600',
        icon: 'check_circle' as const,
    },
    {
        key: 'absent' as const,
        label: 'Absent',
        color: 'bg-rose-50 text-rose-600',
        icon: 'close' as const,
    },
    {
        key: 'onLeave' as const,
        label: 'On Leave',
        color: 'bg-indigo-50 text-indigo-600',
        icon: 'event' as const,
    },
    {
        key: 'late' as const,
        label: 'Late',
        color: 'bg-amber-50 text-amber-600',
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

    const whoIsOut = stats?.whoIsOut ?? [];

    if (loading) {
        return (
            <div className="card-premium p-6 h-full space-y-4">
                <Skeleton height={20} variant="rounded" className="w-32" />
                <div className="grid grid-cols-2 gap-3 flex-1">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} height={80} variant="rounded" className="rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="card-premium p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Summary</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                        {isManagerOrAbove ? `${summary?.total ?? 0} total employees` : 'Today\'s statistics'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/attendance')}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                    Details
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1">
                {METRIC_TILES.map((tile) => {
                    const count = summary ? summary[tile.key] : 0;
                    return (
                        <div
                            key={tile.label}
                            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-center transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm"
                        >
                            <div className={`w-8 h-8 rounded-lg ${tile.color} flex items-center justify-center mb-2`}>
                                <Icon name={tile.icon} size={16} />
                            </div>
                            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                                {count}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                                {tile.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-1.5">
                            {whoIsOut.length === 0 ? (
                                <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                    <Icon name="check_circle" size={12} />
                                </div>
                            ) : (
                                whoIsOut.slice(0, 3).map((person, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-slate-900 overflow-hidden bg-slate-200">
                                        <Avatar name={person.name} size="24px" />
                                    </div>
                                ))
                            )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            {whoIsOut.length === 0 ? 'Full attendance' : `${whoIsOut.length} out today`}
                        </span>
                    </div>
                    {whoIsOut.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {whoIsOut.length > 3 ? `+${whoIsOut.length - 3} more` : 'Absences'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
