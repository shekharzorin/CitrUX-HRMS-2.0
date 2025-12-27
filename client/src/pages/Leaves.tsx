import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const Leaves: React.FC = () => {
    const { } = useAuth(); // Token unused by api service but kept for context
    const [balances, setBalances] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

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
        setLoading(true);
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
        } finally {
            setLoading(false);
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
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    {/* Header removed via Layout dynamic title */}
                    {/* <h1 className="text-2xl font-bold text-slate-800 tracking-tight">My Leaves & Time Off</h1> */}
                    <p className="text-slate-500 text-sm mt-1">View your balances and track your leave history.</p>
                </div>
                <button
                    className="btn-primary flex items-center gap-2 shadow-lg shadow-blue-100"
                    onClick={() => setShowModal(true)}
                >
                    <span className="text-xl leading-none mb-0.5">+</span> Apply Leave
                </button>
            </div>

            {/* Balances Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {balances.map(b => (
                    <div key={b.id} className="glass-panel relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                        {/* Dynamic style for colored bar kept as style prop is appropriate here */}
                        {/* Dynamic style for colored bar kept as style prop is appropriate here */}
                        <div className={`absolute top-0 left-0 w-full h-1 ${getColorClassForLeave(b.leaveType.code)}`}></div>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{b.leaveType.name}</h3>
                                    <p className="text-xs text-slate-400 mt-1">Available Balance</p>
                                </div>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                    {getIconForLeave(b.leaveType.code)}
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-slate-800">{b.balance}</span>
                                <span className="text-sm text-slate-500 font-medium">days</span>
                            </div>
                        </div>
                    </div>
                ))}
                {balances.length === 0 && !loading && (
                    <div className="col-span-full p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        No leave balances assigned yet.
                    </div>
                )}
            </div>

            {/* Recent Requests */}
            <div className="glass-panel overflow-hidden p-0">
                <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                    <span className="text-xl">📅</span>
                    <h2 className="text-lg font-bold text-slate-800">Leave History</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="p-4 pl-6">Type</th>
                                <th className="p-4">Duration</th>
                                <th className="p-4">Requested Days</th>
                                <th className="p-4 max-w-[300px]">Reason</th>
                                <th className="p-4 pr-6 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {requests.length > 0 ? requests.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${getColorClassForLeave(r.leaveType.code)}`}></div>
                                            <span className="font-semibold text-slate-700">{r.leaveType.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-800">
                                                {new Date(r.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                to {new Date(r.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                                            {r.days} Days
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-slate-500 max-w-[300px] truncate group-hover:whitespace-normal transition-all" title={r.reason}>
                                        {r.reason}
                                    </td>
                                    <td className="p-4 pr-6 text-right">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${r.status === 'APPROVED'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : r.status === 'REJECTED'
                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'APPROVED' ? 'bg-emerald-500' : r.status === 'REJECTED' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                                            {r.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center opacity-70">
                                            <span className="text-4xl mb-3">🏖️</span>
                                            <p className="text-lg font-medium">No leave history found</p>
                                            <p className="text-sm">Apply for leave to get started</p>
                                        </div>
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

// Helper for colors
const getColorClassForLeave = (code: string) => {
    switch (code?.toLowerCase()) {
        case 'cl': return 'leave-type-cl'; // Blue
        case 'sl': return 'leave-type-sl'; // Red
        case 'pl': return 'leave-type-pl'; // Green
        default: return 'leave-type-default'; // Purple
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
