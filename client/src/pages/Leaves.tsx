import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const Leaves: React.FC = () => {
    const { } = useAuth(); // Token unused by api service but kept for context
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
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/leaves/apply', formData);
            setShowModal(false);
            setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
            fetchData();
            alert('Leave applied successfully!');
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Failed to apply leave');
        }
    };

    return (
        <div className="page-container">
            {/* Top Stats of Leave Balances */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {balances.map((b) => (
                    <div
                        key={b.id}
                        className={`dashboard-section group hover:-translate-y-1 transition-all duration-300 border-l-4 ${getBorderClassForLeave(b.leaveType.code)}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl glassy-icon-base ${getGlassyClassForLeave(b.leaveType.code)}`}>
                                <span className="text-xl">{getIconForLeave(b.leaveType.code)}</span>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-slate-800">{b.balance}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available</div>
                            </div>
                        </div>
                        <h3 className="text-sm font-bold text-slate-700 m-0">{b.leaveType.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Usage: {b.used || 0} days taken</p>
                    </div>
                ))}
            </div>

            {/* List and Actions */}
            <div className="table-container-premium">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl glassy-icon-base glassy-purple">
                            <span>📅</span>
                        </div>
                        <h3 className="font-bold text-slate-800 m-0">Leave History</h3>
                    </div>
                    <button
                        className="btn-primary flex items-center gap-2 h-11 px-6 font-bold"
                        onClick={() => setShowModal(true)}
                    >
                        <span>+</span> Apply for Leave
                    </button>
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
                                            {new Date(r.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(r.endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Requested on {new Date(r.createdAt).toLocaleDateString()}</div>
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
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            r.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                            {r.status}
                                        </span>
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
const getBorderClassForLeave = (code: string) => {
    switch (code?.toLowerCase()) {
        case 'cl': return 'leave-border-cl'; // Blue
        case 'sl': return 'leave-border-sl'; // Red
        case 'pl': return 'leave-border-pl'; // Green
        default: return 'leave-border-default'; // Purple
    }
};

const getGlassyClassForLeave = (code: string) => {
    switch (code?.toLowerCase()) {
        case 'cl': return 'glassy-blue';
        case 'sl': return 'glassy-orange'; // Red isn't in glassy yet, using orange
        case 'pl': return 'glassy-green';
        default: return 'glassy-purple';
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
