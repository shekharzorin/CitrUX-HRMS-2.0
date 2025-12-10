import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const PerformanceReviews: React.FC = () => {
    const { token } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        userId: '',
        period: 'Q4 2024',
        rating: 3,
        feedback: ''
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/performance/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                alert('Review Submitted');
                setFormData({ ...formData, feedback: '', userId: '' });
            }
        } catch (error) { console.error(error); }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Team Performance Reviews</h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
                        <select className="input-field" value={formData.userId} onChange={e => setFormData({ ...formData, userId: e.target.value })} required>
                            <option value="">Select Employee</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.profile?.firstName} ({u.email})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
                        <input type="text" className="input-field" value={formData.period} onChange={e => setFormData({ ...formData, period: e.target.value })} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Rating (1-5)</label>
                        <input type="number" min="1" max="5" className="input-field" value={formData.rating} onChange={e => setFormData({ ...formData, rating: Number(e.target.value) })} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Feedback</label>
                        <textarea className="input-field min-h-[100px]" value={formData.feedback} onChange={e => setFormData({ ...formData, feedback: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn-primary w-full">Submit Review</button>
                </form>
            </div>
        </div>
    );
};

export default PerformanceReviews;
