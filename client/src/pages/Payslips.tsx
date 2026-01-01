import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';

interface Payslip {
    id: string;
    month: number;
    year: number;
    generatedAt: string;
    gross: number;
    net: number;
    details?: string;
}

interface User {
    id: string;
    email: string;
    employeeId: string;
    profile?: {
        firstName: string;
        lastName: string;
    };
}

const Payslips: React.FC = () => {
    const { user } = useAuth();
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
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
        setLoading(true);
        try {
            const data = await api.get<Payslip[]>('/salary/my');
            setPayslips(data || []);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const fetchUsers = async () => {
        try {
            const data = await api.get<User[]>('/users');
            setUsers(data || []);
        } catch (error) { console.error(error); }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/salary/generate', genData);
            alert('Payslip Generated Successfully');
            fetchPayslips();
        } catch (error: any) {
            alert(error.message || 'Failed to generate');
        }
    };

    return (
        <div className="page-container">
            {/* Admin Generator Section */}
            {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                <div className="dashboard-section mb-10 animate-fade-in">
                    <div className="section-header-premium">
                        <div className="section-icon-badge glassy-icon-base glassy-blue">
                            <Icon name="payroll" size={24} />
                        </div>
                        <div className="flex-1">
                            <h2 className="section-title-premium">Generate Employee Payslip</h2>
                            <p className="section-subtitle-premium">Create and issue monthly salary statements</p>
                        </div>
                    </div>

                    <form onSubmit={handleGenerate} className="mt-8">
                        <div className="form-grid-premium">
                            <div>
                                <label htmlFor="employee-select" className="label">Select Employee</label>
                                <select
                                    id="employee-select"
                                    className="input-field h-11"
                                    value={genData.userId}
                                    onChange={e => setGenData({ ...genData, userId: e.target.value })}
                                    required
                                    title="Choose an employee for payslip generation"
                                >
                                    <option value="">Select Employee...</option>
                                    {users.map((u: User) => <option key={u.id} value={u.id}>{u.profile?.firstName} {u.profile?.lastName} ({u.employeeId})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="month-input" className="label">Month</label>
                                    <input
                                        id="month-input"
                                        type="number"
                                        className="input-field h-11"
                                        value={genData.month}
                                        onChange={e => setGenData({ ...genData, month: Number(e.target.value) })}
                                        min={1}
                                        max={12}
                                        required
                                        title="Payslip Month"
                                        placeholder="MM"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="year-input" className="label">Year</label>
                                    <input
                                        id="year-input"
                                        type="number"
                                        className="input-field h-11"
                                        value={genData.year}
                                        onChange={e => setGenData({ ...genData, year: Number(e.target.value) })}
                                        required
                                        title="Payslip Year"
                                        placeholder="YYYY"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button type="submit" className="btn-primary h-11 px-8 font-bold">Generate Payslip</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Payslips History Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in delay-100">
                {loading ? (
                    <div className="col-span-full p-20 text-center">
                        <div className="animate-spin w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-500 font-bold">Loading Payslips...</p>
                    </div>
                ) : payslips.length > 0 ? payslips.map((p: Payslip) => (
                    <div key={p.id} className="dashboard-section p-0 overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-xs uppercase tracking-widest border border-emerald-100">
                                    {new Date(0, p.month - 1).toLocaleString('default', { month: 'long' })} {p.year}
                                </div>
                                <span className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg shadow-sm">PAID</span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Salary</div>
                                    <div className="text-2xl font-black text-slate-800">₹{p.net.toLocaleString()}</div>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Gross Salary</span>
                                        <span className="font-bold text-slate-700">₹{p.gross.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Deductions</span>
                                        <span className="font-bold text-red-500">₹{(p.gross - p.net).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center group-hover:bg-emerald-50 transition-colors">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Issued: {new Date(p.generatedAt).toLocaleDateString()}</span>
                            <button className="text-[var(--primary)] font-bold text-xs hover:underline flex items-center gap-1" title={`Download payslip for ${new Date(0, p.month - 1).toLocaleString('default', { month: 'long' })} ${p.year} `}>
                                <span>📥</span> Download
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full dashboard-section text-center p-20">
                        <div className="text-4xl mb-4">💸</div>
                        <p className="font-bold text-slate-500">No payslips found in your record.</p>
                        <p className="text-xs text-slate-400">Once generated by HR, your payslips will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Payslips;
