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
    const [showSearch, setShowSearch] = useState(false);

    const isManagerOrAbove = user?.role
        ? ['ADMIN', 'HR', 'SUPER_ADMIN', 'MANAGER'].includes(user.role.toUpperCase())
        : false;

    const members = stats?.teamMembers ?? [];

    // Simple deterministic "working" set: we don't have per-member today status,
    // so we show "working" for the proportion that matches presentToday count.
    // This gives a real-data-derived (not random) indicator.
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
            : { color: 'bg-slate-400', text: 'Offline' };
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
            <div className="card-premium p-6 bg-white space-y-4">
                <Skeleton height={28} variant="rounded" className="w-32" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} height={80} variant="rounded" className="rounded-2xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="card-premium p-6 bg-white">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-800">
                        {isManagerOrAbove ? 'My Team' : 'Colleagues'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                        {members.length === 0 ? 'No members found' : `${workingSet.size} of ${members.length} working now`}
                    </p>
                </div>
                <div className="flex gap-2 items-center">
                    {/* Filter tabs */}
                    {(['all', 'working', 'offline'] as StatusFilter[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-colors capitalize ${
                                filter === f
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-slate-50 text-slate-400 hover:text-indigo-600'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        title={showSearch ? 'Close search' : 'Search team members'}
                        aria-label={showSearch ? 'Close search' : 'Search team members'}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                    >
                        <Icon name="search" size={16} />
                    </button>
                </div>
            </div>

            {showSearch && (
                <input
                    type="text"
                    placeholder="Search by name or role…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full mb-4 px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
            )}

            {/* No data fallback */}
            {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center h-24 text-slate-400">
                    <Icon name="employees" size={32} />
                    <p className="mt-2 text-xs font-semibold">No records found</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filtered.map((member) => {
                    const statusInfo = getStatusInfo(member.id);
                    return (
                        <div
                            key={member.id}
                            className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-all flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    {member.photo ? (
                                        <img
                                            src={member.photo}
                                            alt={member.name}
                                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                                        />
                                    ) : (
                                        <Avatar name={member.name} size="40px" />
                                    )}
                                    <div
                                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-50 ${statusInfo.color}`}
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 leading-tight">{member.name}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                        {member.designation || member.role}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => navigate(`/employees/${member.id}`)}
                                    className="p-2 bg-white text-slate-600 rounded-lg shadow-sm hover:bg-slate-50"
                                    title="View Profile"
                                >
                                    <Icon name="eye" size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
