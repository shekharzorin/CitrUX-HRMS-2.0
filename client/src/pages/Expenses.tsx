import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';

const Expenses: React.FC = () => {
    const { showToast } = useToast();
    const [claims, setClaims] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [form, setForm] = useState({ categoryId: '', amount: '', description: '', date: '', receiptUrl: '' });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchClaims(), fetchCategories()]);
            setLoading(false);
        };
        init();
    }, []);

    const fetchClaims = async () => {
        try {
            const data = await api.get<any[]>('/expenses/claims');
            setClaims(data || []);
        } catch (error) { console.error(error); }
    };

    const fetchCategories = async () => {
        try {
            const data = await api.get<any[]>('/expenses/categories');
            setCategories(data || []);
        } catch (error) { console.error(error); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/expenses/claims', form);
            showToast('Claim Submitted', 'success');
            setForm({ categoryId: '', amount: '', description: '', date: '', receiptUrl: '' });
            setIsFormOpen(false);
            fetchClaims();
        } catch (error) { console.error(error); showToast('Submission failed', 'error'); }
    };

    return (
        <div className="page-container space-y-8">
            <PageHeader
                title="My Expenses"
                subtitle="Manage and track your expense claims"
                icon="expenses"
                actions={
                    <Button
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="shadow-lg shadow-indigo-500/20"
                    >
                        {isFormOpen ? 'Cancel' : '+ New Claim'}
                    </Button>
                }
            />

            {/* Form Section ... */}
            {isFormOpen && (
                <div className="glass-panel p-6 mb-8 max-w-2xl animate-fade-in">
                    <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Submit Expense Claim</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="date" className="form-label">Date</label>
                                <input id="date" type="date" className="input-field" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                            </div>
                            <div>
                                <label htmlFor="category" className="form-label">Category</label>
                                <select id="category" className="input-field" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} required>
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="amount" className="form-label">Amount</label>
                                <input id="amount" type="number" className="input-field" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                            </div>
                            <div>
                                <label htmlFor="receiptUrl" className="form-label">Receipt URL</label>
                                <input id="receiptUrl" type="text" placeholder="https://..." className="input-field" value={form.receiptUrl} onChange={e => setForm({ ...form, receiptUrl: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="description" className="form-label">Description</label>
                            <textarea id="description" className="input-field min-h-[100px] py-3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                        </div>
                        <button type="submit" className="btn-primary w-full py-2.5 rounded-xl shadow-lg shadow-indigo-500/20">Submit Claim</button>
                    </form>
                </div>
            )}

            <div className="glass-panel overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="flex gap-4"><Skeleton width="20%" height={24} /><Skeleton width="40%" height={24} /><Skeleton width="20%" height={24} /></div>)}
                    </div>
                ) : claims.length === 0 ? (
                    <EmptyState title="No Expenses" description="You haven't submitted any expense claims yet." icon="expenses" />
                ) : (
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Receipt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {claims.map(c => (
                                <tr key={c.id}>
                                    <td className="font-medium text-slate-700 dark:text-slate-300">{new Date(c.date).toLocaleDateString()}</td>
                                    <td className="text-slate-500">{categories.find(cat => cat.id === c.categoryId)?.name || '-'}</td>
                                    <td className="text-slate-500">{c.description}</td>
                                    <td className="font-bold">₹{c.amount}</td>
                                    <td>
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                                        ${c.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                                c.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' :
                                                    'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td>
                                        {c.receiptUrl && <a href={c.receiptUrl} target="_blank" className="text-indigo-600 hover:text-indigo-500 font-medium text-xs">View Receipt</a>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Expenses;
