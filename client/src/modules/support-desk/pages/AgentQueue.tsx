import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDepartments, useTickets } from '../hooks';
import { StatusBadge, PriorityBadge, DensityToggle, useDensity, relativeTime } from '../ui';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED', 'REOPENED'];

const AgentQueue = () => {
    const [status, setStatus] = useState('');
    const [deptId, setDeptId] = useState('');
    const { data: queues } = useDepartments();
    const { data: tickets, isLoading } = useTickets({ status: status || undefined, supportDepartmentId: deptId || undefined });
    const [density] = useDensity();
    const compact = density === 'compact';

    return (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Support Console</h1>
                <DensityToggle />
            </div>

            {/* Queue filters */}
            <div className="flex flex-wrap gap-2 mb-4">
                <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="text-sm px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" aria-label="Filter by queue">
                    <option value="">All queues</option>
                    {queues?.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" aria-label="Filter by status">
                    <option value="">All statuses</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
            </div>

            {isLoading && <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />}
            {tickets && tickets.length === 0 && <p className="text-sm text-slate-500 py-10 text-center">No tickets match these filters.</p>}

            {tickets && tickets.length > 0 && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    {tickets.map((t) => (
                        <Link key={t.id} to={`/support/console/${t.id}`}
                            className={`flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${compact ? 'px-3 py-1.5' : 'px-4 py-3'}`}>
                            <span className="text-xs text-slate-400 w-12 shrink-0">#{t.ticketNumber}</span>
                            <span className={`flex-1 min-w-0 truncate text-slate-800 dark:text-slate-100 ${compact ? 'text-sm' : ''}`}>{t.subject}</span>
                            <span className="hidden sm:block text-xs text-slate-400 w-32 truncate">{t.supportDepartment?.name}</span>
                            <StatusBadge status={t.status} />
                            {!compact && <PriorityBadge priority={t.priority} />}
                            <span className="hidden md:block text-xs text-slate-400 w-20 text-right">{relativeTime(t.updatedAt)}</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AgentQueue;
