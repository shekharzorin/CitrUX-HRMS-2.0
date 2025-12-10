import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Expenses: React.FC = () => {
    const { token } = useAuth();
    const [claims, setClaims] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [form, setForm] = useState({ categoryId: '', amount: '', description: '', date: '', receiptUrl: '' });
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => {
        fetchClaims();
        fetchCategories();
    }, []);

    const fetchClaims = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/expenses/claims', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setClaims(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/expenses/categories', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setCategories(await res.json());
        } catch (error) { console.error(error); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/expenses/claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                alert('Claim Submitted');
                setForm({ categoryId: '', amount: '', description: '', date: '', receiptUrl: '' });
                setIsFormOpen(false);
                fetchClaims();
            }
        } catch (error) { console.error(error); }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">My Expenses</h1>
                <button onClick={() => setIsFormOpen(!isFormOpen)} className="btn-primary">
                    {isFormOpen ? 'Cancel' : '+ New Claim'}
                </button>
            </div>

            {isFormOpen && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 max-w-2xl">
                    <h2 className="text-lg font-bold mb-4">Submit Expense Claim</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                <input type="date" className="input-field" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                <select className="input-field" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} required>
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                                <input type="number" className="input-field" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Receipt URL</label>
                                <input type="text" placeholder="https://..." className="input-field" value={form.receiptUrl} onChange={e => setForm({ ...form, receiptUrl: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                        </div>
                        <button type="submit" className="btn-primary w-full">Submit Claim</button>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 text-sm font-semibold text-slate-600">Date</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Category</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Description</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Amount</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Receipt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {claims.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">No claims found.</td></tr>}
                        {claims.map(c => (
                            <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-4 text-sm">{new Date(c.date).toLocaleDateString()}</td>
                                <td className="p-4 text-sm font-medium">{c.category?.name}</td>
                                <td className="p-4 text-sm text-slate-600">{c.description}</td>
                                <td className="p-4 text-sm font-bold">₹{c.amount}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold 
                                        ${c.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                            c.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {c.status}
                                    </span>
                                </td>
                                <td className="p-4 text-sm">
                                    {c.receiptUrl && <a href={c.receiptUrl} target="_blank" className="text-blue-600 hover:underline">View</a>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Expenses;
