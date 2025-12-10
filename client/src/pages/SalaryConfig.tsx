import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SalaryConfig: React.FC = () => {
    const { token } = useAuth();
    const [userId, setUserId] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        basic: 0,
        hra: 0,
        da: 0,
        allowances: 0,
        deductions: 0
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setUsers(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchSalary = async (uid: string) => {
        try {
            const res = await fetch(`http://localhost:5000/api/salary/structure/${uid}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setFormData({
                        basic: data.basic,
                        hra: data.hra,
                        da: data.da,
                        allowances: data.allowances,
                        deductions: data.deductions
                    });
                } else {
                    // Reset if no data
                    setFormData({ basic: 0, hra: 0, da: 0, allowances: 0, deductions: 0 });
                }
            }
        } catch (error) { console.error(error); }
    };

    const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const uid = e.target.value;
        setUserId(uid);
        if (uid) fetchSalary(uid);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/salary/structure', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ userId, ...formData })
            });
            if (res.ok) alert('Salary Structure Updated!');
        } catch (error) { console.error(error); }
    };

    const ctc = Object.values(formData).reduce((a, b) => a + Number(b), 0) - Number(formData.deductions) * 2; // Simple hack calc
    const gross = Number(formData.basic) + Number(formData.hra) + Number(formData.da) + Number(formData.allowances);
    const net = gross - Number(formData.deductions);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Salary Configuration</h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Employee</label>
                    <select className="input-field" value={userId} onChange={handleUserChange}>
                        <option value="">-- Select --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.profile?.firstName} ( {u.email} )</option>)}
                    </select>
                </div>

                {userId && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Basic Salary</label>
                                <input type="number" className="input-field" value={formData.basic} onChange={e => setFormData({ ...formData, basic: Number(e.target.value) })} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">HRA</label>
                                <input type="number" className="input-field" value={formData.hra} onChange={e => setFormData({ ...formData, hra: Number(e.target.value) })} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">DA</label>
                                <input type="number" className="input-field" value={formData.da} onChange={e => setFormData({ ...formData, da: Number(e.target.value) })} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Allowances</label>
                                <input type="number" className="input-field" value={formData.allowances} onChange={e => setFormData({ ...formData, allowances: Number(e.target.value) })} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Deductions</label>
                                <input type="number" className="input-field" value={formData.deductions} onChange={e => setFormData({ ...formData, deductions: Number(e.target.value) })} required />
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg mt-4">
                            <div className="flex justify-between mb-1"><span>Gross Salary:</span> <span className="font-bold">₹{gross}</span></div>
                            <div className="flex justify-between mb-1 text-slate-600"><span>Annual CTC (Approx):</span> <span className="font-bold">₹{ctc}</span></div>
                            <div className="flex justify-between mb-1 text-red-600"><span>Net Salary (Monthly):</span> <span className="font-bold">₹{net}</span></div>
                        </div>

                        <button type="submit" className="btn-primary w-full">Save Structure</button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SalaryConfig;
