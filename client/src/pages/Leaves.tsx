import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { StatBox, WidgetHeader } from '../components/ui/DashboardElements';
import { Icon } from '../components/ui/Icons';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';

const Leaves: React.FC = () => {
    const { showToast } = useToast();
    const [balances, setBalances] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [balData, reqData, typeData] = await Promise.all([
                api.get<any[]>('/leaves/balances'),
                api.get<any[]>('/leaves/my-requests'),
                api.get<any[]>('/leaves/types')
            ]);

            if (balData) setBalances(balData);
            if (reqData) setRequests(reqData);
            if (typeData) setLeaveTypes(typeData);
        } catch (error) {
            console.error(error);
            showToast('Failed to fetch leave data.', 'error');
        }
    };

    // Helper for safe date formatting
    const formatDate = (dateString: any, options: Intl.DateTimeFormatOptions = {}) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            return date.toLocaleDateString([], options);
        } catch (e) {
            return '-';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/leaves/apply', formData);
            setShowModal(false);
            setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
            fetchData();
            showToast('Leave applied successfully!', 'success');
        } catch (error: any) {
            console.error(error);
            showToast(error.message || 'Failed to apply leave', 'error');
        }
    };

    return (
        <div className="page-container space-y-8">
            <PageHeader
                title="Leave Management"
                subtitle="Manage your time off requests and view leave balances."
                icon="leaves"
            />

            {/* Top Stats of Leave Balances */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {balances.map((b) => (
                    <StatBox
                        key={b.id}
                        label={b.leaveType.name}
                        value={b.balance}
                        sub={`${b.used || 0} days taken`}
                        icon={getIconForStatBox(b.leaveType.code)}
                        color={getColorForLeave(b.leaveType.code)}
                    />
                ))}
            </div>

            {/* List and Actions */}
            <div className="glass-panel overflow-hidden border-none shadow-sm">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800">
                    <WidgetHeader
                        title="Leave History"
                        icon="schedule"
                        className="mb-0"
                    />
                    <Button
                        onClick={() => setShowModal(true)}
                        leftIcon={<Icon name="plus" size={18} />}
                    >
                        Apply for Leave
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Leave Type</th>
                                <th>Duration & Dates</th>
                                <th>Period</th>
                                <th>Reason</th>
                                <th className="text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length > 0 ? requests.map(r => (
                                <tr key={r.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 text-sm">
                                                {getIconForLeave(r.leaveType.code)}
                                            </div>
                                            <span className="font-bold text-slate-700">{r.leaveType.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="font-bold text-slate-800">
                                            {formatDate(r.startDate, { month: 'short', day: 'numeric' })} - {formatDate(r.endDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Requested on {formatDate(r.createdAt)}</div>
                                    </td>
                                    <td>
                                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                            {r.days} Days
                                        </span>
                                    </td>
                                    <td className="text-sm text-slate-500 max-w-[200px] truncate" title={r.reason}>
                                        {r.reason}
                                    </td>
                                    <td className="text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                r.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                {r.status}
                                            </span>
                                            {r.status === 'PENDING' && (
                                                <button
                                                    onClick={async () => {
                                                        if (confirm('Are you sure you want to cancel this leave request?')) {
                                                            try {
                                                                await api.delete(`/leaves/requests/${r.id}`);
                                                                fetchData();
                                                            } catch (err: any) {
                                                                alert(err.message || 'Failed to cancel leave');
                                                            }
                                                        }
                                                    }}
                                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Cancel Request"
                                                >
                                                    <span className="text-xs font-bold">✕</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center text-slate-400">
                                        <div className="text-4xl mb-4">🏜️</div>
                                        <p className="font-bold">No leave history found</p>
                                        <p className="text-xs">Your requested time off will appear here.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Apply Leave Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all" onClick={() => setShowModal(false)}>
                    <div className="glass-panel w-full max-w-md p-0 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">Apply for Leave</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Close modal">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label htmlFor="leaveType" className="label">Leave Type</label>
                                <select
                                    id="leaveType"
                                    className="input-field"
                                    value={formData.leaveTypeId}
                                    onChange={e => setFormData({ ...formData, leaveTypeId: e.target.value })}
                                    required
                                    title="Select Leave Type"
                                >
                                    <option value="">Select a leave type...</option>
                                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="startDate" className="label">Start Date</label>
                                    <input
                                        id="startDate"
                                        type="date"
                                        className="input-field"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="label">End Date</label>
                                    <input
                                        id="endDate"
                                        type="date"
                                        className="input-field"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="reason" className="label">Reason</label>
                                <textarea
                                    id="reason"
                                    className="input-field min-h-[100px]"
                                    placeholder="Please describe the reason for your leave..."
                                    rows={3}
                                    value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                    required
                                ></textarea>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary flex-1">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper for classes
const getColorForLeave = (code: string) => {
    switch (code?.toLowerCase()) {
        case 'cl': return 'text-indigo-600 dark:text-indigo-400';
        case 'sl': return 'text-rose-600 dark:text-rose-400';
        case 'pl': return 'text-emerald-600 dark:text-emerald-400';
        default: return 'text-amber-600 dark:text-amber-400';
    }
};

const getIconForStatBox = (code: string) => {
    switch (code?.toLowerCase()) {
        case 'cl': return 'employees' as const;
        case 'sl': return 'attendance' as const;
        case 'pl': return 'leaves' as const;
        default: return 'event' as const;
    }
};

const getIconForLeave = (code: string) => {
    switch (code?.toLowerCase()) {
        case 'cl': return '👔';
        case 'sl': return '🤒';
        case 'pl': return '🌴';
        default: return '📄';
    }
};

export default Leaves;
