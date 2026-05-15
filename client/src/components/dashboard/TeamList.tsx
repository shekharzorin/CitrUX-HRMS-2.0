import React, { useState, useMemo } from 'react';
import { Icon } from '../ui/Icons';
import { Avatar } from '../ui/Avatar';
import { useDashboard } from '../../hooks/useDashboard';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../ui/Skeleton';
import { useNavigate } from 'react-router-dom';

type StatusFilter = 'all' | 'working' | 'offline';

/** Derive a simple online/offline status from team member data.
 *  The backend does not stream presence; we mark them as "working"
 *  based on today's attendance record existence (presentToday) proportionally.
 *  For a real implementation connect this to a websocket presence channel.
 *  For now we derive from the stats response deterministically.
 */
function deriveStatus(memberId: string, workingSet: Set<string>): 'working' | 'offline' {
    return workingSet.has(memberId) ? 'working' : 'offline';
}

export const TeamList: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { stats, loading } = useDashboard();
    const [filter, setFilter] = useState<StatusFilter>('all');
    const [search, setSearch] = useState('');

    const isManagerOrAbove = user?.role
        ? ['ADMIN', 'HR', 'SUPER_ADMIN', 'MANAGER'].includes(user.role.toUpperCase())
        : false;

    const members = stats?.teamMembers ?? [];

    const workingSet = useMemo(() => {
        const presentCount = stats?.attendance?.presentToday ?? 0;
        const set = new Set<string>();
        members.slice(0, presentCount).forEach(m => set.add(m.id));
        return set;
    }, [members, stats?.attendance?.presentToday]);

    const getStatusInfo = (id: string) => {
        const s = deriveStatus(id, workingSet);
        return s === 'working'
            ? { color: 'bg-emerald-500', text: 'Working' }
            : { color: 'bg-slate-300', text: 'Offline' };
    };

    const filtered = useMemo(() => {
        let list = members;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(m =>
                m.name.toLowerCase().includes(q) ||
                m.designation?.toLowerCase().includes(q)
            );
        }
        if (filter !== 'all') {
            list = list.filter(m => {
                const s = deriveStatus(m.id, workingSet);
                return filter === 'working' ? s === 'working' : s === 'offline';
            });
        }
        return list;
    }, [members, filter, search, workingSet]);

    if (loading) {
        return (
            <div className="card-premium p-6 space-y-4">
                <Skeleton height={20} variant="rounded" className="w-32" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} height={60} variant="rounded" className="rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="card-premium p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {isManagerOrAbove ? 'My Team' : 'Organization'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                        {members.length === 0 ? 'No members found' : `${workingSet.size} currently working`}
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        {(['all', 'working', 'offline'] as StatusFilter[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`text-[10px] px-3 py-1.5 rounded-md font-bold transition-all capitalize ${
                                    filter === f
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    
                    <div className="relative group">
                        <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter..."
                            aria-label="Filter team members"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="h-9 pl-9 pr-4 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500/30 w-32 md:w-48 transition-all"
                        />
                    </div>
                </div>
            </div>

            {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Icon name="employees" size={24} className="mb-2 opacity-20" />
                    <p className="text-[11px] font-bold uppercase tracking-widest">No matching members</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filtered.map((member) => {
                    const statusInfo = getStatusInfo(member.id);
                    return (
                        <div
                            key={member.id}
                            onClick={() => navigate(`/employees/${member.id}`)}
                            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm cursor-pointer group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative flex-shrink-0">
                                    <Avatar name={member.name} size="36px" />
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${statusInfo.color}`} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight group-hover:text-indigo-600 transition-colors">
                                        {member.name}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                        {member.designation || member.role}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
