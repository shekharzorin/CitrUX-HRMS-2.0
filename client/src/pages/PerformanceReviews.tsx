import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const PerformanceReviews: React.FC = () => {
    const { user, token } = useAuth();
    const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');
    const [users, setUsers] = useState<any[]>([]);
    const [myReviews, setMyReviews] = useState<any[]>([]);
    const [teamReviews, setTeamReviews] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        userId: '',
        period: 'Q4 2024',
        rating: 3,
        feedback: ''
    });

    const isManagerOrAdmin = ['ADMIN', 'HR', 'MANAGER', 'SUPER_ADMIN'].includes(user?.role || '');

    useEffect(() => {
        fetchMyReviews();
        if (isManagerOrAdmin) {
            fetchUsers();
            fetchTeamReviews();
        }
    }, [user]);

    const fetchUsers = async () => {
        try {
            const data = await api.get<any[]>('/users');
            if (data) setUsers(data);
        } catch (error) { console.error(error); }
    };

    const fetchMyReviews = async () => {
        try {
            const data = await api.get<any[]>('/performance/reviews');
            if (data) setMyReviews(data);
        } catch (error) { console.error(error); }
    };

    const fetchTeamReviews = async () => {
        try {
            const data = await api.get<any[]>('/performance/reviews/team');
            if (data) setTeamReviews(data);
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
                fetchTeamReviews(); // Refresh list
            }
        } catch (error) { console.error(error); }
    };

    return (
        <div className="p-6 page-container">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Performance Reviews</h1>
                {isManagerOrAdmin && (
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('my')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'my' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            My History
                        </button>
                        <button
                            onClick={() => setActiveTab('team')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'team' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Team Reviews
                        </button>
                    </div>
                )}
            </div>

            {activeTab === 'my' && (
                <div className="space-y-4 animate-fade-in">
                    {myReviews.length === 0 ? (
                        <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
                            <p>No performance reviews found for your profile.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {myReviews.map((review: any) => (
                                <div key={review.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg">{review.period} Review</h3>
                                            <p className="text-xs text-slate-500">Reviewed by {review.reviewer?.profile?.firstName || 'Manager'} on {new Date(review.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${review.rating >= 4 ? 'bg-green-100 text-green-700' : review.rating >= 3 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                            Rating: {review.rating}/5
                                        </div>
                                    </div>
                                    <div className="mt-3 p-4 bg-slate-50 rounded-lg text-sm text-slate-700 italic">
                                        "{review.feedback}"
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'team' && isManagerOrAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    {/* Review Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-6">
                            <h3 className="text-lg font-bold mb-4 text-slate-800">Submit New Review</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="employeeSelect" className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
                                    <select id="employeeSelect" className="input-field w-full" value={formData.userId} onChange={e => setFormData({ ...formData, userId: e.target.value })} required>
                                        <option value="">Select Employee</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.profile?.firstName} {u.profile?.lastName} ({u.email})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="period" className="block text-sm font-medium text-slate-700 mb-1">Period</label>
                                    <input id="period" type="text" className="input-field w-full" value={formData.period} onChange={e => setFormData({ ...formData, period: e.target.value })} required />
                                </div>
                                <div>
                                    <label htmlFor="rating" className="block text-sm font-medium text-slate-700 mb-1">Rating (1-5)</label>
                                    <input id="rating" type="number" min="1" max="5" className="input-field w-full" value={formData.rating} onChange={e => setFormData({ ...formData, rating: Number(e.target.value) })} required />
                                </div>
                                <div>
                                    <label htmlFor="feedback" className="block text-sm font-medium text-slate-700 mb-1">Feedback</label>
                                    <textarea id="feedback" className="input-field min-h-[100px] w-full" value={formData.feedback} onChange={e => setFormData({ ...formData, feedback: e.target.value })} required />
                                </div>
                                <button type="submit" className="btn-primary w-full">Submit Review</button>
                            </form>
                        </div>
                    </div>

                    {/* Team Reviews List */}
                    <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-lg font-bold text-slate-700 px-1">Submitted Reviews ({teamReviews.length})</h3>
                        {teamReviews.length === 0 ? (
                            <div className="bg-slate-50 p-8 rounded-xl border-2 border-dashed border-slate-200 text-center text-slate-400">
                                No reviews submitted by you yet.
                            </div>
                        ) : (
                            teamReviews.map((review: any) => (
                                <div key={review.id} className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                {review.user?.profile?.firstName?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{review.user?.profile?.firstName} {review.user?.profile?.lastName}</h4>
                                                <p className="text-xs text-slate-500">{review.user?.email}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{review.period}</div>
                                            <div className="text-sm font-bold text-slate-700">Rating: {review.rating}/5</div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        "{review.feedback}"
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceReviews;
