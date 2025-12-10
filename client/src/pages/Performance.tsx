import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Performance: React.FC = () => {
    const { token } = useAuth();
    const [goals, setGoals] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [newGoal, setNewGoal] = useState({ title: '', deadline: '' });

    useEffect(() => {
        fetchGoals();
        fetchReviews();
    }, []);

    const fetchGoals = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/performance/goals', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setGoals(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchReviews = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/performance/reviews', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setReviews(await res.json());
        } catch (error) { console.error(error); }
    };

    const handleAddGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/performance/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(newGoal)
            });
            if (res.ok) {
                setNewGoal({ title: '', deadline: '' });
                fetchGoals();
            }
        } catch (error) { console.error(error); }
    };

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-2xl font-bold text-slate-800">My Performance</h1>

            {/* Goals Section */}
            <div>
                <h2 className="text-lg font-semibold mb-4">My Goals</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold mb-4 text-sm uppercase text-slate-500">Set New Goal</h3>
                        <form onSubmit={handleAddGoal} className="space-y-4">
                            <input type="text" placeholder="Goal Title" className="input-field"
                                value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })} required />
                            <input type="date" className="input-field"
                                value={newGoal.deadline} onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })} required />
                            <button type="submit" className="btn-primary w-full">Add Goal</button>
                        </form>
                    </div>

                    <div className="space-y-4">
                        {goals.length === 0 && <p className="text-slate-500 italic">No active goals.</p>}
                        {goals.map(g => (
                            <div key={g.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-slate-800">{g.title}</h4>
                                    <p className="text-xs text-slate-500">Due: {new Date(g.deadline).toLocaleDateString()}</p>
                                </div>
                                <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded font-bold">{g.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Reviews Section */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Performance Reviews</h2>
                <div className="grid gap-4">
                    {reviews.length === 0 && <p className="text-slate-500 italic">No reviews yet.</p>}
                    {reviews.map(r => (
                        <div key={r.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex justify-between mb-4">
                                <h3 className="font-bold text-lg">{r.period} Review</h3>
                                <div className="flex items-center gap-1">
                                    <span className="text-yellow-500 font-bold text-xl">★</span>
                                    <span className="font-bold text-lg">{r.rating}/5</span>
                                </div>
                            </div>
                            <p className="text-slate-600 italic">"{r.feedback}"</p>
                            <p className="text-xs text-slate-400 mt-4 text-right">Reviewed by {r.reviewer?.profile?.firstName}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Performance;
