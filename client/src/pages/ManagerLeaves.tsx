import React, { useState, useEffect } from 'react';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { WidgetHeader } from '../components/ui/DashboardElements';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';

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

    return (
        <div className="page-container space-y-8">
            <PageHeader
                title="Team Leave Requests"
                subtitle="Review and manage leave requests from your team members."
                icon="team_leaves"
            />

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 flex gap-4">
                            <Skeleton width={150} height={20} />
                            <Skeleton width={100} height={20} />
                            <Skeleton width="100%" height={20} />
                        </div>
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <EmptyState
                    title="No Pending Requests"
                    description="Your team has no pending leave requests at this time."
                    icon="team_leaves"
                />
            ) : (
                <Card noPadding className="overflow-hidden border-none shadow-sm">
                    <div className="p-6 border-b border-slate-100 bg-white dark:bg-slate-800">
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
                                        <td className="font-bold text-slate-700">
                                            {req.user.profile?.firstName} {req.user.profile?.lastName}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{getIconForLeave(req.leaveType.code)}</span>
                                                <span className="font-medium">{req.leaveType.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="font-bold text-slate-800">
                                                {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest border border-slate-200">
                                                {req.days} Days
                                            </span>
                                        </td>
                                        <td className="text-sm text-slate-500 italic max-w-[200px] truncate" title={req.reason}>
                                            "{req.reason}"
                                        </td>
                                        <td>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                req.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            {req.status === 'PENDING' && (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="!bg-emerald-600 hover:!bg-emerald-700"
                                                        onClick={() => handleAction(req.id, 'APPROVED')}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                                        onClick={() => handleAction(req.id, 'REJECTED')}
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

// Helper for icons
const getIconForLeave = (code: string) => {
    switch (code?.toLowerCase()) {
        case 'cl': return '👔';
        case 'sl': return '🤒';
        case 'pl': return '🌴';
        default: return '📄';
    }
};

export default ManagerLeaves;
