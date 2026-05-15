import React, { useState } from 'react';
import { Icon } from '../ui/Icons';
import { Avatar } from '../ui/Avatar';
import { useDashboard } from '../../hooks/useDashboard';
import { getPriority, approveLeave, rejectLeave, approveExpense, rejectExpense } from '../../services/dashboard.service';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../ui/Skeleton';

interface ActionRow {
    id: string;
    type: 'leave' | 'expense';
    employee: string;
    detail: string;
    status: 'URGENT' | 'PENDING';
    date: string;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const hours = diff / 3_600_000;
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    if (hours < 48) return 'Yesterday';
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export const ActionList: React.FC = () => {
    const { user } = useAuth();
    const { stats, loading, refresh } = useDashboard();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const isManagerOrAbove = user?.role
        ? ['ADMIN', 'HR', 'SUPER_ADMIN', 'MANAGER'].includes(user.role.toUpperCase())
        : false;

    const actions: ActionRow[] = React.useMemo(() => {
        if (!stats?.pendingActions) return [];
        const rows: ActionRow[] = [];

        (stats.pendingActions.leaves ?? []).forEach(l => {
            const days = Math.ceil(
                (new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86_400_000
            ) + 1;
            rows.push({
                id: `leave-${l.id}`,
                type: 'leave',
                employee: l.userName,
                detail: `${l.leaveType} — ${days} day${days !== 1 ? 's' : ''}`,
                status: getPriority(l.startDate),
                date: formatDate(l.startDate),
            });
        });

        (stats.pendingActions.expenses ?? []).forEach(e => {
            rows.push({
                id: `expense-${e.id}`,
                type: 'expense',
                employee: e.userName,
                detail: `${e.description} — ₹${e.amount.toLocaleString('en-IN')}`,
                status: 'PENDING',
                date: 'Pending',
            });
        });

        return rows;
    }, [stats]);

    const handleAction = async (
        action: ActionRow,
        verdict: 'APPROVE' | 'REJECT'
    ) => {
        setActionLoading(`${action.id}-${verdict}`);
        try {
            const rawId = action.id.replace(/^(leave|expense)-/, '');
            if (action.type === 'leave') {
                verdict === 'APPROVE' ? await approveLeave(rawId) : await rejectLeave(rawId);
            } else {
                verdict === 'APPROVE' ? await approveExpense(rawId) : await rejectExpense(rawId);
            }
            await refresh();
        } catch {
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="card-premium p-6 h-full space-y-4">
                <Skeleton height={20} variant="rounded" className="w-32" />
                {[1, 2, 3].map(i => <Skeleton key={i} height={80} variant="rounded" className="rounded-xl" />)}
            </div>
        );
    }

    return (
        <div className="card-premium p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Inbox</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                        {actions.length === 0
                            ? 'All caught up'
                            : `${actions.length} pending approval${actions.length !== 1 ? 's' : ''}`}
                    </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                    <Icon name="event" size={16} />
                </div>
            </div>

            <div className="space-y-3 flex-1">
                {actions.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                        <Icon name="check_circle" size={32} className="mb-3 opacity-20" />
                        <p className="text-[11px] font-bold uppercase tracking-widest">Everything is clear</p>
                    </div>
                )}

                {actions.map((action) => (
                    <div
                        key={action.id}
                        className="group p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm"
                    >
                        <div className="flex justify-between items-start mb-2.5">
                            <div className="flex items-center gap-3">
                                <Avatar name={action.employee} size="32px" />
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{action.employee}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                                        {action.type}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                        action.status === 'URGENT'
                                            ? 'bg-rose-100 text-rose-700'
                                            : 'bg-amber-100 text-amber-700'
                                    }`}
                                >
                                    {action.status}
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-4 line-clamp-1">
                            {action.detail}
                        </p>

                        {isManagerOrAbove && (
                            <div className="flex gap-2">
                                <button
                                    disabled={!!actionLoading}
                                    onClick={() => handleAction(action, 'APPROVE')}
                                    className="flex-1 btn btn-primary h-8 text-[10px]"
                                >
                                    {actionLoading === `${action.id}-APPROVE` ? '…' : 'Approve'}
                                </button>
                                <button
                                    disabled={!!actionLoading}
                                    onClick={() => handleAction(action, 'REJECT')}
                                    className="flex-1 btn btn-secondary h-8 text-[10px] border-rose-100 text-rose-600 hover:bg-rose-50"
                                >
                                    {actionLoading === `${action.id}-REJECT` ? '…' : 'Reject'}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {actions.length > 0 && (
                <button className="w-full mt-6 py-2.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest border-t border-slate-100 dark:border-slate-800">
                    See history
                </button>
            )}
        </div>
    );
};
