import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const SalaryConfig: React.FC<{ embedded?: boolean }> = ({ embedded }) => {
    // const { } = useAuth(); // Token unused by api service
    const { } = useAuth();
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
            const data = await api.get<any[]>('/users');
            setUsers(data || []);
        } catch (error) { console.error(error); }
    };

    const fetchSalary = async (uid: string) => {
        try {
            const data = await api.get<any>(`/salary/structure/${uid}`);
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
            await api.post('/salary/structure', { userId, ...formData });
            alert('Salary Structure Updated!');
        } catch (error) { console.error(error); }
    };

    const ctc = Object.values(formData).reduce((a, b) => a + Number(b), 0) - Number(formData.deductions) * 2; // Simple hack calc
    const gross = Number(formData.basic) + Number(formData.hra) + Number(formData.da) + Number(formData.allowances);
    const net = gross - Number(formData.deductions);

    return (
        <div className={embedded ? "animate-fade-in" : "p-6 animate-fade-in"}>
            {!embedded && <h1 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Salary Configuration</h1>}

            <div className="glass-panel p-6 md:p-8 max-w-2xl">
                <div className="mb-8">
                    <label htmlFor="userSelect" className="form-label">Select Employee</label>
                    <select id="userSelect" className="input-field" value={userId} onChange={handleUserChange}>
                        <option value="">-- Select --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.profile?.firstName} ( {u.email} )</option>)}
                    </select>
                </div>

                {userId && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="basicSalary" className="form-label">Basic Salary</label>
                                <input id="basicSalary" type="number" className="input-field" value={formData.basic} onChange={e => setFormData({ ...formData, basic: Number(e.target.value) })} required />
                            </div>
                            <div>
                                <label htmlFor="hra" className="form-label">HRA</label>
                                <input id="hra" type="number" className="input-field" value={formData.hra} onChange={e => setFormData({ ...formData, hra: Number(e.target.value) })} required />
                            </div>
                            <div>
                                <label htmlFor="da" className="form-label">DA</label>
                                <input id="da" type="number" className="input-field" value={formData.da} onChange={e => setFormData({ ...formData, da: Number(e.target.value) })} required />
                            </div>
                            <div>
                                <label htmlFor="allowances" className="form-label">Allowances</label>
                                <input id="allowances" type="number" className="input-field" value={formData.allowances} onChange={e => setFormData({ ...formData, allowances: Number(e.target.value) })} required />
                            </div>
                            <div>
                                <label htmlFor="deductions" className="form-label">Deductions</label>
                                <input id="deductions" type="number" className="input-field" value={formData.deductions} onChange={e => setFormData({ ...formData, deductions: Number(e.target.value) })} required />
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Gross Salary</span>
                                <span className="font-bold text-slate-900 dark:text-white">₹{gross}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Annual CTC (Approx)</span>
                                <span className="font-bold text-slate-900 dark:text-white">₹{ctc}</span>
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-base">
                                <span className="font-bold text-slate-900 dark:text-white">Net Salary (Monthly)</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{net}</span>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary w-full">Save Structure</button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SalaryConfig;
