import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ManagerLeaves: React.FC = () => {
    const { token } = useAuth();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/leaves/team-requests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            }
        } catch (error) {
            console.error('Error fetching requests', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        if (!confirm(`Are you sure you want to ${status} this request?`)) return;

        try {
            const res = await fetch(`http://localhost:5000/api/leaves/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, comment: `${status} by Manager` })
            });

            if (res.ok) {
                fetchRequests(); // Refresh
            } else {
                alert('Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status', error);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [token]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Team Leave Requests</h1>

            {loading ? (
                <p>Loading...</p>
            ) : requests.length === 0 ? (
                <p className="text-slate-500">No pending requests.</p>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase">
                            <tr>
                                <th className="p-4">Employee</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Dates</th>
                                <th className="p-4">Days</th>
                                <th className="p-4">Reason</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {requests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium text-slate-800">
                                        {req.user.profile?.firstName} {req.user.profile?.lastName}
                                    </td>
                                    <td className="p-4 text-slate-600">{req.leaveType.name}</td>
                                    <td className="p-4 text-slate-600">
                                        {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-slate-600">{req.days}</td>
                                    <td className="p-4 text-slate-600 italic">"{req.reason}"</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                            ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        {req.status === 'PENDING' && (
                                            <>
                                                <button
                                                    onClick={() => handleAction(req.id, 'APPROVED')}
                                                    className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req.id, 'REJECTED')}
                                                    className="px-3 py-1 bg-red-100 text-red-600 rounded-md text-sm hover:bg-red-200 transition"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ManagerLeaves;
