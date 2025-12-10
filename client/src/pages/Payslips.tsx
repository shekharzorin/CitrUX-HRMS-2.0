import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Payslips: React.FC = () => {
    const { token, user } = useAuth();
    const [payslips, setPayslips] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [genData, setGenData] = useState({
        userId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    useEffect(() => {
        fetchPayslips();
        if (user?.role === 'ADMIN' || user?.role === 'HR') fetchUsers();
    }, [user]);

    const fetchPayslips = async () => {
        try {
            const endpoint = (user?.role === 'ADMIN' || user?.role === 'HR')
                ? 'http://localhost:5000/api/salary/my' // Reuse or create all listing? Let's use 'my' for now for safety or add 'all' later
                : 'http://localhost:5000/api/salary/my';

            // Ideally Admin should see all. For now reusing existing endpoint or simple fetch
            const response = await fetch(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) setPayslips(await response.json());
        } catch (error) { console.error(error); }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/users', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setUsers(await res.json());
        } catch (error) { console.error(error); }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/salary/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(genData)
            });
            if (res.ok) {
                alert('Payslip Generated Successfully');
                fetchPayslips();
            } else {
                const err = await res.json();
                alert(err.message);
            }
        } catch (error) { console.error(error); }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Payslips</h1>

            {/* Admin Generator */}
            {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
                    <h2 className="text-lg font-semibold mb-4">Generate Payslip</h2>
                    <form onSubmit={handleGenerate} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
                            <select className="input-field" value={genData.userId} onChange={e => setGenData({ ...genData, userId: e.target.value })} required>
                                <option value="">Select Employee</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.profile?.firstName} ({u.email})</option>)}
                            </select>
                        </div>
                        <div className="w-24">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                            <input type="number" className="input-field" value={genData.month} onChange={e => setGenData({ ...genData, month: Number(e.target.value) })} min={1} max={12} required />
                        </div>
                        <div className="w-32">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                            <input type="number" className="input-field" value={genData.year} onChange={e => setGenData({ ...genData, year: Number(e.target.value) })} required />
                        </div>
                        <button type="submit" className="btn-primary">Generate</button>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {payslips.map(p => (
                    <div key={p.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
                        <div className="flex justify-between items-start mb-4 pl-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{p.month} / {p.year}</h3>
                                <p className="text-sm text-slate-500">Generated: {new Date(p.generatedAt).toLocaleDateString()}</p>
                            </div>
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">PAID</span>
                        </div>
                        <div className="pl-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Gross Salary</span>
                                <span className="font-medium text-slate-900">₹{p.gross.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Net Salary</span>
                                <span className="font-bold text-green-600 text-lg">₹{p.net.toLocaleString()}</span>
                            </div>
                        </div>
                        {p.details && (
                            <div className="mt-4 pt-4 border-t border-slate-100 pl-4">
                                <details className="text-xs text-slate-500 cursor-pointer">
                                    <summary>View Breakdown</summary>
                                    <pre className="mt-2 bg-slate-50 p-2 rounded">{JSON.stringify(JSON.parse(p.details), null, 2)}</pre>
                                </details>
                            </div>
                        )}
                    </div>
                ))}
                {payslips.length === 0 && <p className="text-slate-500 italic col-span-full">No payslip history found.</p>}
            </div>
        </div>
    );
};

export default Payslips;
