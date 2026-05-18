import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Icon } from '../components/ui/Icons';
import { format, parseISO } from 'date-fns';

const BAGES = ['star', 'trophy', 'medal', 'celebration', 'thumb_up', 'favorite'];

const Engagement: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [events, setEvents] = useState<{birthdays: any[], anniversaries: any[]}>({ birthdays: [], anniversaries: [] });
    const [recognitions, setRecognitions] = useState<any[]>([]);
    const [appraisals, setAppraisals] = useState<{myAppraisals: any[], teamAppraisals: any[]}>({ myAppraisals: [], teamAppraisals: [] });
    
    const [users, setUsers] = useState<any[]>([]);
    const [showRecModal, setShowRecModal] = useState(false);
    const [showAppraisalModal, setShowAppraisalModal] = useState(false);

    // Forms
    const [recForm, setRecForm] = useState({ userId: '', category: 'PEER_TO_PEER', badge: 'star', message: '' });
    const [appForm, setAppForm] = useState({ userId: '', period: '', rating: '3', feedback: '' });

    const isManager = ['MANAGER', 'ADMIN', 'HR', 'SUPER_ADMIN'].includes(user?.role || '');

    const fetchData = async () => {
        try {
            const [evtData, recData, appData] = await Promise.all([
                api.get('/engagement/events'),
                api.get('/engagement/recognitions'),
                api.get('/engagement/appraisals')
            ]);
            setEvents(evtData as any);
            setRecognitions(recData as any);
            setAppraisals(appData as any);

            if (isManager || true) {
                const uData = await api.get('/users');
                setUsers(uData as any);
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to fetch engagement data', 'error');
        }
    };

    useEffect(() => { fetchData(); }, []);

    const submitRecognition = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/engagement/recognitions', recForm);
            showToast('Recognition sent!', 'success');
            setShowRecModal(false);
            setRecForm({ userId: '', category: 'PEER_TO_PEER', badge: 'star', message: '' });
            fetchData();
        } catch (error: any) {
            showToast(error.message || 'Failed to send recognition', 'error');
        }
    };

    const submitAppraisal = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/engagement/appraisals', appForm);
            showToast('Appraisal submitted!', 'success');
            setShowAppraisalModal(false);
            setAppForm({ userId: '', period: '', rating: '3', feedback: '' });
            fetchData();
        } catch (error: any) {
            showToast(error.message || 'Failed to submit appraisal', 'error');
        }
    };

    return (
        <div className="page-container">
            <PageHeader
                title="Engagement & Culture"
                subtitle="Celebrate birthdays, recognize achievements, and manage appraisals."
                icon="celebration"
                gradient="gradient-rose"
                actions={
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowRecModal(true)}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl backdrop-blur-md border border-white/30 transition-all flex items-center gap-2 shadow-lg text-sm"
                        >
                            <Icon name="star" size={16} /> Give Recognition
                        </button>
                        {isManager && (
                            <button
                                onClick={() => setShowAppraisalModal(true)}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl backdrop-blur-md border border-white/30 transition-all flex items-center gap-2 shadow-lg text-sm"
                            >
                                <Icon name="reviews" size={16} /> New Appraisal
                            </button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* ── Upcoming Events ── */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-6 border border-slate-100">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4">
                            <Icon name="event" size={20} className="text-rose-500" /> Upcoming Events
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Birthdays</h4>
                                {events.birthdays.length === 0 ? (
                                    <p className="text-sm text-slate-500">No upcoming birthdays.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {events.birthdays.map((b: any, i) => (
                                            <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                                {b.avatar ? (
                                                    <img src={b.avatar} alt={b.name} className="w-10 h-10 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 text-white flex items-center justify-center font-bold">
                                                        {b.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{b.name}</p>
                                                    <p className="text-xs text-rose-500 font-medium">🎂 {format(parseISO(b.date), 'MMM do')}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2 mt-2">Work Anniversaries</h4>
                                {events.anniversaries.length === 0 ? (
                                    <p className="text-sm text-slate-500">No upcoming anniversaries.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {events.anniversaries.map((a: any, i) => (
                                            <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                                {a.avatar ? (
                                                    <img src={a.avatar} alt={a.name} className="w-10 h-10 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 text-white flex items-center justify-center font-bold">
                                                        {a.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{a.name}</p>
                                                    <p className="text-xs text-blue-500 font-medium">🎉 {a.years} {a.years === 1 ? 'Year' : 'Years'} ({format(parseISO(a.date), 'MMM do')})</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Recognition Wall ── */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel p-6 border border-slate-100">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4">
                            <Icon name="celebration" size={20} className="text-amber-500" /> Recognition Wall
                        </h3>
                        
                        {recognitions.length === 0 ? (
                            <div className="py-12 flex flex-col items-center text-slate-400">
                                <Icon name="star" size={40} className="opacity-20 mb-2" />
                                <p>No recognitions yet. Be the first to recognize someone!</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                {recognitions.map((r: any) => (
                                    <div key={r.id} className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-white border border-amber-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-2 right-2 text-amber-200 opacity-30">
                                            <Icon name={r.badge} size={64} />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                                                    <Icon name={r.badge} size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {r.user.profile?.firstName} {r.user.profile?.lastName}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        Recognized by {r.giver.profile?.firstName} • {format(parseISO(r.createdAt), 'MMM d, yyyy')}
                                                    </p>
                                                </div>
                                                <div className="ml-auto">
                                                    <span className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 rounded-full">
                                                        {r.category.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-slate-700 italic border-l-2 border-amber-300 pl-3">
                                                "{r.message}"
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Appraisals ── */}
                <div className="lg:col-span-3">
                    <div className="glass-panel p-6 border border-slate-100">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4">
                            <Icon name="trending_up" size={20} className="text-emerald-500" /> Performance Appraisals
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* My Appraisals */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-600 mb-3 border-b pb-2">My Appraisals</h4>
                                {appraisals.myAppraisals.length === 0 ? (
                                    <p className="text-sm text-slate-400">No appraisals available.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {appraisals.myAppraisals.map((app: any) => (
                                            <div key={app.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{app.period}</span>
                                                        <p className="text-sm font-medium mt-1">Reviewer: {app.reviewer.profile?.firstName} {app.reviewer.profile?.lastName}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">
                                                        <Icon name="star" size={14} />
                                                        <span className="font-black">{app.rating}/5</span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-600 mt-2 line-clamp-2" title={app.feedback}>{app.feedback}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Team Appraisals */}
                            {isManager && (
                                <div>
                                    <h4 className="text-sm font-bold text-slate-600 mb-3 border-b pb-2">Team Appraisals</h4>
                                    {appraisals.teamAppraisals.length === 0 ? (
                                        <p className="text-sm text-slate-400">No team appraisals submitted.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {appraisals.teamAppraisals.map((app: any) => (
                                                <div key={app.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{app.period}</span>
                                                            <p className="text-sm font-bold text-indigo-600 mt-1">{app.user.profile?.firstName} {app.user.profile?.lastName}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg">
                                                            <Icon name="star" size={14} />
                                                            <span className="font-black">{app.rating}/5</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mt-2 line-clamp-2" title={app.feedback}>{app.feedback}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Give Recognition */}
            {showRecModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Icon name="star" className="text-amber-500" /> Give Recognition</h3>
                            <button type="button" title="Close modal" aria-label="Close modal" onClick={() => setShowRecModal(false)}><Icon name="close" size={24} className="text-slate-400" /></button>
                        </div>
                        <form onSubmit={submitRecognition} className="space-y-4">
                            <div>
                                <label className="form-label" htmlFor="rec-user">Employee *</label>
                                <select id="rec-user" title="Select employee" className="input-field" required value={recForm.userId} onChange={e => setRecForm({...recForm, userId: e.target.value})}>
                                    <option value="">Select an employee...</option>
                                    {users.filter(u => u.id !== user?.id).map(u => (
                                        <option key={u.id} value={u.id}>{u.profile?.firstName} {u.profile?.lastName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label" htmlFor="rec-category">Category</label>
                                    <select id="rec-category" title="Select category" className="input-field" value={recForm.category} onChange={e => setRecForm({...recForm, category: e.target.value})}>
                                        <option value="PEER_TO_PEER">Peer to Peer</option>
                                        <option value="ACHIEVEMENT">Achievement</option>
                                        <option value="AWARD">Award / Trophy</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label" htmlFor="rec-badge">Badge Icon</label>
                                    <select id="rec-badge" title="Select badge" className="input-field font-mono" value={recForm.badge} onChange={e => setRecForm({...recForm, badge: e.target.value})}>
                                        {BAGES.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="form-label" htmlFor="rec-message">Message *</label>
                                <textarea id="rec-message" className="input-field" rows={3} required placeholder="Why are they awesome?" value={recForm.message} onChange={e => setRecForm({...recForm, message: e.target.value})}></textarea>
                            </div>
                            <button type="submit" className="btn-primary w-full">Send Recognition</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: New Appraisal */}
            {showAppraisalModal && isManager && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Icon name="reviews" className="text-emerald-500" /> New Appraisal</h3>
                            <button type="button" title="Close modal" aria-label="Close modal" onClick={() => setShowAppraisalModal(false)}><Icon name="close" size={24} className="text-slate-400" /></button>
                        </div>
                        <form onSubmit={submitAppraisal} className="space-y-4">
                            <div>
                                <label className="form-label" htmlFor="app-user">Employee *</label>
                                <select id="app-user" title="Select employee" className="input-field" required value={appForm.userId} onChange={e => setAppForm({...appForm, userId: e.target.value})}>
                                    <option value="">Select an employee...</option>
                                    {users.filter(u => u.id !== user?.id).map(u => (
                                        <option key={u.id} value={u.id}>{u.profile?.firstName} {u.profile?.lastName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label" htmlFor="app-period">Period *</label>
                                    <input id="app-period" type="text" className="input-field" required placeholder="e.g. Q3 2026" value={appForm.period} onChange={e => setAppForm({...appForm, period: e.target.value})} />
                                </div>
                                <div>
                                    <label className="form-label" htmlFor="app-rating">Rating (1-5) *</label>
                                    <select id="app-rating" title="Select rating" className="input-field" required value={appForm.rating} onChange={e => setAppForm({...appForm, rating: e.target.value})}>
                                        <option value="1">1 - Needs Improvement</option>
                                        <option value="2">2 - Below Expectations</option>
                                        <option value="3">3 - Meets Expectations</option>
                                        <option value="4">4 - Exceeds Expectations</option>
                                        <option value="5">5 - Outstanding</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="form-label" htmlFor="app-feedback">Feedback *</label>
                                <textarea id="app-feedback" className="input-field" rows={4} required placeholder="Detailed performance feedback..." value={appForm.feedback} onChange={e => setAppForm({...appForm, feedback: e.target.value})}></textarea>
                            </div>
                            <button type="submit" className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700">Submit Appraisal</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Engagement;
