import React, { useState, useEffect } from 'react';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { WidgetHeader } from '../components/ui/DashboardElements';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icons';
import { format, parseISO } from 'date-fns';

const ManagerLeaves: React.FC = () => {
    const { showToast } = useToast();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const data = await api.get<any[]>('/leaves/team-requests');
            if (data) setRequests(data);
        } catch (error) {
            console.error('Error fetching requests', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        if (!confirm(`Are you sure you want to ${status} this request?`)) return;

        try {
            await api.put(`/leaves/${id}/status`, { status, comment: `${status} by Manager` });
            showToast(`Request ${status.toLowerCase()}`, 'success');
            fetchRequests();
        } catch (error: any) {
            console.error('Error updating status', error);
            showToast(error.message || 'Failed to update status', 'error');
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Helper for classes
    const getLeaveBadgeColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
            case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
            case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
            default: return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700';
        }
    };

    return (
        <div className="page-container space-y-8">
            <PageHeader
                title="Team Leave Requests"
                subtitle="Review and manage leave requests from your team members."
                icon="employees"
            />

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="card-premium p-4 flex gap-4">
                            <Skeleton width={40} height={40} variant="circular" />
                            <div className="flex-1 space-y-2">
                                <Skeleton width={150} height={20} />
                                <Skeleton width={100} height={16} />
                            </div>
                            <Skeleton width={100} height={40} />
                        </div>
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <EmptyState
                    title="No Pending Requests"
                    description="Your team has no pending leave requests at this time."
                    icon="leaves"
                    className="py-12"
                />
            ) : (
                <div className="card-premium overflow-hidden border-none shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <WidgetHeader
                            title="Approval Queue"
                            icon="schedule"
                            className="mb-0"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Type</th>
                                    <th>Dates</th>
                                    <th>Days</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((req) => (
                                    <tr key={req.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400">
                                                    {req.user.profile?.firstName?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-[var(--text-main)]">
                                                        {req.user.profile?.firstName} {req.user.profile?.lastName}
                                                    </div>
                                                    <div className="text-xs text-[var(--text-muted)]">{req.user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${req.leaveType.code === 'CL' ? 'bg-blue-50 text-blue-600' :
                                                    req.leaveType.code === 'SL' ? 'bg-rose-50 text-rose-600' :
                                                        'bg-amber-50 text-amber-600'
                                                    }`}>
                                                    {req.leaveType.code === 'CL' ? <Icon name="profile" size={14} /> :
                                                        req.leaveType.code === 'SL' ? <Icon name="plus" size={14} /> :
                                                            <Icon name="leaves" size={14} />}
                                                </div>
                                                <span className="font-medium text-sm">{req.leaveType.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="font-bold text-[var(--text-main)] text-sm">
                                                {format(parseISO(req.startDate), 'MMM d')} - {format(parseISO(req.endDate), 'MMM d, yyyy')}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                                {req.days} Days
                                            </span>
                                        </td>
                                        <td className="text-sm text-[var(--text-muted)] italic max-w-[200px] truncate" title={req.reason}>
                                            &ldquo;{req.reason}&rdquo;
                                        </td>
                                        <td>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getLeaveBadgeColor(req.status)}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            {req.status === 'PENDING' && (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="text-xs !bg-emerald-500 hover:!bg-emerald-600 shadow-lg shadow-emerald-500/20"
                                                        onClick={() => handleAction(req.id, 'APPROVED')}
                                                        aria-label={`Approve leave for ${req.user.profile?.firstName}`}
                                                        title="Approve"
                                                    >
                                                        <Icon name="check_circle" size={14} className="mr-1" /> Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/10"
                                                        onClick={() => handleAction(req.id, 'REJECTED')}
                                                        aria-label={`Reject leave for ${req.user.profile?.firstName}`}
                                                        title="Reject"
                                                    >
                                                        <Icon name="close" size={14} className="mr-1" /> Reject
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerLeaves;
