import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
const ExpenseApprovals: React.FC = () => {
    const [claims, setClaims] = useState<any[]>([]);

    const fetchPending = async () => {
        try {
            const data = await api.get<any[]>('/expenses/approvals');
            setClaims(data || []);
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        const init = async () => { await fetchPending(); };
        init();
    }, []);

    const handleUpdate = async (id: string, status: string) => {
        try {
            await api.put(`/expenses/claims/${id}/status`, { status });
            fetchPending();
        } catch (error) { console.error(error); }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Expense Approvals</h1>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 text-sm font-semibold text-slate-600">Employee</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Date</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Category</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Amount</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {claims.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">No pending claims.</td></tr>}
                        {claims.map(c => (
                            <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-4">
                                    <div className="font-bold text-slate-800">{c.user?.profile?.firstName}</div>
                                    <div className="text-xs text-slate-500">{c.user?.email}</div>
                                </td>
                                <td className="p-4 text-sm">{new Date(c.date).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <div className="font-medium text-sm">{c.category?.name}</div>
                                    <div className="text-xs text-slate-500">{c.description}</div>
                                </td>
                                <td className="p-4 text-sm font-bold">₹{c.amount}</td>
                                <td className="p-4 flex gap-2">
                                    <button onClick={() => handleUpdate(c.id, 'APPROVED')} className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded font-bold">Approve</button>
                                    <button onClick={() => handleUpdate(c.id, 'REJECTED')} className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded font-bold">Reject</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExpenseApprovals;
