import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Offboarding: React.FC = () => {
    const { token, user } = useAuth();
    const [status, setStatus] = useState<any>(null);
    const [list, setList] = useState<any[]>([]);
    const [reason, setReason] = useState('');
    const [lastDay, setLastDay] = useState('');

    useEffect(() => {
        if (user?.role === 'ADMIN' || user?.role === 'HR') {
            fetchResignations();
        } else {
            fetchStatus();
        }
    }, [user]);

    const fetchStatus = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/offboarding/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setStatus(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchResignations = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/offboarding/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setList(await res.json());
        } catch (error) { console.error(error); }
    };

    const handleResign = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/offboarding/resign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ reason, lastDay })
            });
            if (res.ok) fetchStatus();
        } catch (error) { console.error(error); }
    };

    const handleUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`http://localhost:5000/api/offboarding/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) fetchResignations();
        } catch (error) { console.error(error); }
    };

    if (user?.role === 'ADMIN' || user?.role === 'HR') {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-6 text-slate-800">Offboarding Dashboard</h1>
                <div className="grid gap-4">
                    {list.length === 0 && <p className="text-slate-500">No active resignations.</p>}
                    {list.map(item => (
                        <div key={item.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">
                                        {item.user?.profile?.firstName} <span className="text-slate-400 font-normal">({item.user?.email})</span>
                                    </h3>
                                    <p className="text-sm text-slate-600 mt-2"><span className="font-bold">Reason:</span> {item.reason}</p>
                                    <p className="text-sm text-slate-600"><span className="font-bold">Last Working Day:</span> {new Date(item.lastDay).toLocaleDateString()}</p>
                                    <p className="mt-2 inline-block px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">Status: {item.status}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {item.status === 'PENDING' && (
                                        <>
                                            <button onClick={() => handleUpdate(item.id, 'APPROVED')} className="btn-primary bg-green-600">Approve</button>
                                            <button onClick={() => handleUpdate(item.id, 'REJECTED')} className="btn-primary bg-red-600">Reject</button>
                                        </>
                                    )}
                                    {item.status === 'APPROVED' && (
                                        <button onClick={() => handleUpdate(item.id, 'CLEARED')} className="btn-primary">Mark Cleared</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Employee View
    if (status) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-6 text-slate-800">Resignation Status</h1>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
                    <h2 className="text-lg font-bold mb-2">Status: {status.status}</h2>
                    <p className="text-slate-600 mb-4">You have submitted your resignation.</p>
                    <p><span className="font-bold">Last Day:</span> {new Date(status.lastDay).toLocaleDateString()}</p>

                    {status.status === 'CLEARED' && (
                        <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg">
                            <p className="font-bold">You have been successfully offboarded.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Submit Resignation</h1>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
                <p className="text-slate-500 mb-6 text-sm">We're sorry to see you go. Please fill out the details below to initiate the exit process.</p>
                <form onSubmit={handleResign} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Last Working Day</label>
                        <input type="date" className="input-field" value={lastDay} onChange={e => setLastDay(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Leaving</label>
                        <textarea className="input-field min-h-[100px]" value={reason} onChange={e => setReason(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn-primary bg-red-600 hover:bg-red-700 text-white w-full">Submit Resignation</button>
                </form>
            </div>
        </div>
    );
};

export default Offboarding;
