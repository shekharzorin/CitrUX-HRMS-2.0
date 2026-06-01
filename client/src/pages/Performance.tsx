import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Button } from '../design-system/components/Button';
import { Input } from '../design-system/components/Input';
import { Badge } from '../design-system/components/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../design-system/components/Card';

const Performance: React.FC = () => {
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
        <div className="page-container space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Performance & Goals</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Goals Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center text-xl shadow-sm">
                            🎯
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Goals</h2>
                    </div>

                    <Card className="bg-slate-50/50 dark:bg-slate-800/50 border-dashed">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">{editingGoal ? 'Edit Goal' : 'Set New Goal'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={editingGoal ? handleUpdateGoal : handleAddGoal} className="space-y-4">
                                <Input
                                    type="text"
                                    placeholder="Goal Title"
                                    value={editingGoal ? editingGoal.title : newGoal.title}
                                    onChange={e => editingGoal ? setEditingGoal({ ...editingGoal, title: e.target.value }) : setNewGoal({ ...newGoal, title: e.target.value })}
                                    required
                                    aria-label="Goal Title"
                                />
                                <div className="flex flex-wrap gap-3">
                                    <Input
                                        type="date"
                                        className="flex-1 min-w-[150px]"
                                        value={editingGoal ? new Date(editingGoal.deadline).toISOString().split('T')[0] : newGoal.deadline}
                                        onChange={e => editingGoal ? setEditingGoal({ ...editingGoal, deadline: e.target.value }) : setNewGoal({ ...newGoal, deadline: e.target.value })}
                                        required
                                        aria-label="Goal Deadline"
                                    />
                                    {editingGoal && (
                                        <select
                                            className="h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                                            value={editingGoal.status}
                                            onChange={e => setEditingGoal({ ...editingGoal, status: e.target.value })}
                                            aria-label="Goal Status"
                                        >
                                            <option value="PENDING">Pending</option>
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="COMPLETED">Completed</option>
                                        </select>
                                    )}
                                    <Button type="submit" variant={editingGoal ? 'outline' : 'primary'} className={editingGoal ? 'border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10' : ''}>
                                        {editingGoal ? 'Update Goal' : 'Add Goal'}
                                    </Button>
                                    {editingGoal && (
                                        <Button type="button" variant="ghost" onClick={() => setEditingGoal(null)}>
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        {goals.length === 0 && <p className="text-slate-500 dark:text-slate-400 text-center py-8 text-sm italic">No active goals found.</p>}
                        {goals.map(g => (
                            <Card key={g.id} className="group overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
                                <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight mb-1">{g.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Due: {new Date(g.deadline).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                        <Badge variant={
                                            g.status === 'COMPLETED' ? 'success' :
                                            g.status === 'IN_PROGRESS' ? 'info' : 'default'
                                        }>
                                            {g.status.replace('_', ' ')}
                                        </Badge>
                                        <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" onClick={() => setEditingGoal(g)} title="Edit" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                                                ✏️
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={() => handleDeleteGoal(g.id)} title="Delete" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                                                🗑️
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 flex items-center justify-center text-xl shadow-sm">
                            ⭐
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Performance Reviews</h2>
                    </div>

                    <div className="grid gap-4">
                        {reviews.length === 0 && <p className="text-slate-500 dark:text-slate-400 text-center py-8 text-sm italic">No reviews yet.</p>}
                        {reviews.map(r => (
                            <Card key={r.id} className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/50">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-5 text-9xl leading-none select-none">❝</div>
                                <CardContent className="p-6 relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{r.period} Review</h3>
                                        <Badge variant="warning" className="text-sm px-2 py-1 gap-1 flex items-center">
                                            <span>★</span>
                                            <span>{r.rating}/5</span>
                                        </Badge>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300 italic leading-relaxed text-sm">"{r.feedback}"</p>
                                    
                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reviewed By</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                                                {r.reviewer?.profile?.firstName?.[0] || 'M'}
                                            </div>
                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{r.reviewer?.profile?.firstName || 'Manager'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Performance;
