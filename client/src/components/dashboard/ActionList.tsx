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

    // Build a unified action list from real API data
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
            // errors are handled globally by the api service
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="card-premium p-6 h-full flex flex-col bg-white space-y-4">
                <Skeleton height={28} variant="rounded" className="w-40" />
                {[1, 2, 3].map(i => <Skeleton key={i} height={96} variant="rounded" className="rounded-2xl" />)}
            </div>
        );
    }

    return (
        <div className="card-premium p-6 h-full flex flex-col bg-white">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-800">Action Required</h3>
                    <p className="text-xs text-slate-500 font-medium">
                        {actions.length === 0
                            ? 'No pending items'
                            : `${actions.length} item${actions.length !== 1 ? 's' : ''} need your attention`}
                    </p>
                </div>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Icon name="event" size={20} />
                </div>
            </div>

            <div className="space-y-4 flex-1">
                {/* No data fallback */}
                {actions.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                        <Icon name="check_circle" size={40} />
                        <p className="mt-3 text-sm font-semibold">
                            {isManagerOrAbove
                                ? 'All caught up! No pending approvals.'
                                : 'No actions required for your account.'}
                        </p>
                    </div>
                )}

                {actions.map((action) => (
                    <div
                        key={action.id}
                        className="group p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <Avatar name={action.employee} size="32px" />
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{action.employee}</p>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                        {action.type}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-medium">{action.date}</span>
                                <span
                                    className={`text-[10px] font-black px-2 py-1 rounded-md ${
                                        action.status === 'URGENT'
                                            ? 'bg-rose-100 text-rose-700'
                                            : 'bg-amber-100 text-amber-700'
                                    }`}
                                >
                                    {action.status}
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 font-medium mb-4 line-clamp-1">
                            {action.detail}
                        </p>

                        {isManagerOrAbove && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    disabled={!!actionLoading}
                                    onClick={() => handleAction(action, 'APPROVE')}
                                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {actionLoading === `${action.id}-APPROVE` ? '…' : 'Approve'}
                                </button>
                                <button
                                    disabled={!!actionLoading}
                                    onClick={() => handleAction(action, 'REJECT')}
                                    className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {actionLoading === `${action.id}-REJECT` ? '…' : 'Reject'}
                                </button>
                                <button className="flex-1 py-2 bg-white text-slate-600 border border-slate-200 text-[10px] font-bold rounded-lg transition-colors">
                                    View
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button className="w-full mt-6 py-3 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
                View All Pending Approvals
            </button>
        </div>
    );
};
