import React, { useState, useEffect } from 'react';
import { api } from '../services/api';



const Performance: React.FC = () => {
    // const { user } = useAuth();
    const [goals, setGoals] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [newGoal, setNewGoal] = useState({ title: '', deadline: '' });
    const [editingGoal, setEditingGoal] = useState<any>(null);

    const fetchGoals = async () => {
        try {
            const data = await api.get<any[]>('/performance/goals');
            setGoals(data);
        } catch (error) { console.error(error); }
    };

    const fetchReviews = async () => {
        try {
            const data = await api.get<any[]>('/performance/reviews');
            setReviews(data);
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        const init = async () => {
            await fetchGoals();
            await fetchReviews();
        };
        init();
    }, []);

    const handleAddGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/performance/goals', newGoal);
            setNewGoal({ title: '', deadline: '' });
            fetchGoals();
        } catch (error) { console.error(error); }
    };

    const handleUpdateGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGoal) return;
        try {
            await api.put(`/performance/goals/${editingGoal.id}`, editingGoal);
            setEditingGoal(null);
            fetchGoals();
        } catch (error) { console.error(error); }
    };

    const handleDeleteGoal = async (id: string) => {
        if (!confirm('Delete this goal?')) return;
        try {
            await api.delete(`/performance/goals/${id}`);
            fetchGoals();
        } catch (error) { console.error(error); }
    };

    return (
        <div className="page-container">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Performance & Goals</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Goals Section */}
                <div className="dashboard-section">
                    <div className="section-header-premium mb-6">
                        <div className="section-icon-badge glassy-icon-base glassy-green">
                            <span>🎯</span>
                        </div>
                        <h2 className="section-title-premium">My Goals</h2>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                        <h3 className="font-bold text-sm text-slate-700 mb-3">{editingGoal ? 'Edit Goal' : 'Set New Goal'}</h3>
                        <form onSubmit={editingGoal ? handleUpdateGoal : handleAddGoal} className="space-y-3">
                            <input
                                type="text"
                                placeholder="Goal Title"
                                className="input-field bg-white"
                                value={editingGoal ? editingGoal.title : newGoal.title}
                                onChange={e => editingGoal ? setEditingGoal({ ...editingGoal, title: e.target.value }) : setNewGoal({ ...newGoal, title: e.target.value })}
                                required
                                aria-label="Goal Title"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    className="input-field bg-white"
                                    value={editingGoal ? new Date(editingGoal.deadline).toISOString().split('T')[0] : newGoal.deadline}
                                    onChange={e => editingGoal ? setEditingGoal({ ...editingGoal, deadline: e.target.value }) : setNewGoal({ ...newGoal, deadline: e.target.value })}
                                    required
                                    aria-label="Goal Deadline"
                                />
                                {editingGoal && (
                                    <select
                                        className="input-field bg-white w-32"
                                        value={editingGoal.status}
                                        onChange={e => setEditingGoal({ ...editingGoal, status: e.target.value })}
                                        aria-label="Goal Status"
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                )}
                                <button type="submit" className={`btn-primary whitespace-nowrap ${editingGoal ? 'bg-amber-500 hover:bg-amber-600' : ''}`}>
                                    {editingGoal ? 'Update' : 'Add Goal'}
                                </button>
                                {editingGoal && <button type="button" onClick={() => setEditingGoal(null)} className="btn-secondary">Cancel</button>}
                            </div>
                        </form>
                    </div>

                    <div className="space-y-3">
                        {goals.length === 0 && <p className="text-slate-400 text-center py-8 italic">No active goals found.</p>}
                        {goals.map(g => (
                            <div key={g.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group">
                                <div>
                                    <h4 className="font-bold text-slate-800">{g.title}</h4>
                                    <p className="text-xs text-slate-500 font-medium">Due: {new Date(g.deadline).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${g.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                        g.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {g.status}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingGoal(g)} className="text-slate-400 hover:text-blue-500 p-1" title="Edit">✏️</button>
                                        <button onClick={() => handleDeleteGoal(g.id)} className="text-slate-400 hover:text-red-500 p-1" title="Delete">🗑️</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="dashboard-section">
                    <div className="section-header-premium mb-6">
                        <div className="section-icon-badge glassy-icon-base glassy-purple">
                            <span>⭐</span>
                        </div>
                        <h2 className="section-title-premium">Performance Reviews</h2>
                    </div>
                    <div className="grid gap-4">
                        {reviews.length === 0 && <p className="text-slate-400 text-center py-8 italic">No reviews yet.</p>}
                        {reviews.map(r => (
                            <div key={r.id} className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl leading-none select-none">❝</div>
                                <div className="flex justify-between mb-4 relative z-10">
                                    <h3 className="font-bold text-lg text-slate-800">{r.period} Review</h3>
                                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                                        <span className="text-yellow-500 font-bold text-lg">★</span>
                                        <span className="font-bold text-slate-800">{r.rating}/5</span>
                                    </div>
                                </div>
                                <p className="text-slate-600 italic relative z-10 leading-relaxed">"{r.feedback}"</p>
                                <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-400 uppercase tracking-widest">Reviewed By</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                            {r.reviewer?.profile?.firstName?.[0] || 'M'}
                                        </div>
                                        <span className="font-bold text-slate-700">{r.reviewer?.profile?.firstName || 'Manager'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Performance;
