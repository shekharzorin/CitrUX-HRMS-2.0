import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { format } from 'date-fns';

const TimesheetApprovals: React.FC = () => {
    // const { } = useAuth();
    const [pending, setPending] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const data = await api.get<any[]>('/timesheets/pending');
            setPending(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        const comment = status === 'REJECTED' ? prompt('Enter reason for rejection:') : '';
        if (status === 'REJECTED' && comment === null) return;

        try {
            await api.post('/timesheets/approve', { id, status, comment });
            setMessage(`Timesheet ${status.toLowerCase()} successfully`);
            fetchPending();
        } catch (error) {
            console.error(error);
            alert('Failed to update status');
        }
    };

    return (
        <div className="page-container">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-[var(--text-main)] mb-2">Timesheet Approvals</h1>
                <p className="text-[var(--text-muted)]">Review and manage employee weekly timesheet submissions.</p>
            </div>

            {message && (
                <div className="mb-6 p-4 bg-emerald-100 text-emerald-700 rounded-xl font-bold animate-fade-in flex justify-between items-center">
                    <span>{message}</span>
                    <button onClick={() => setMessage('')} className="text-emerald-900 opacity-50">✕</button>
                </div>
            )}

            {loading ? (
                <div className="text-center py-20 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)]">
                    <div className="animate-spin w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-[var(--text-muted)] font-bold">Fetching pending submissions...</p>
                </div>
            ) : pending.length === 0 ? (
                <div className="text-center py-20 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] border-dashed">
                    <div className="text-4xl mb-4">🏆</div>
                    <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Awaiting Submissions</h3>
                    <p className="text-[var(--text-muted)]">There are no pending timesheets in the queue.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {pending.map(ts => (
                        <div key={ts.id} className="glass-panel overflow-hidden border-l-4 border-l-[var(--primary)]">
                            <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-body)] flex items-center justify-center font-bold text-[var(--primary)] text-xl border border-[var(--border-color)]">
                                        {ts.user?.profile?.firstName?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">{ts.user?.profile?.firstName} {ts.user?.profile?.lastName}</h4>
                                        <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">
                                            <span>{ts.user?.employeeId}</span>
                                            <span>•</span>
                                            <span>Week: {format(new Date(ts.startDate), 'dd MMM')} - {format(new Date(ts.endDate), 'dd MMM yyyy')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="text-right mr-4 hidden md:block">
                                        <div className="text-xs font-bold text-[var(--text-muted)] uppercase">Total Hours</div>
                                        <div className="text-2xl font-black text-[var(--primary)]">
                                            {ts.entries.reduce((sum: number, e: any) => sum + (e.total || 0), 0).toFixed(1)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAction(ts.id, 'REJECTED')}
                                        className="btn-secondary h-12 px-6 font-bold text-red-600 hover:bg-red-50 hover:border-red-200 flex-1 md:flex-none"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleAction(ts.id, 'APPROVED')}
                                        className="btn-primary h-12 px-8 font-bold flex-1 md:flex-none"
                                    >
                                        Approve
                                    </button>
                                </div>
                            </div>

                            <div className="bg-[var(--bg-body)] border-t border-[var(--border-color)]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)]">
                                            <th className="p-3 pl-6">Project / Task</th>
                                            <th className="p-3 text-center">M</th>
                                            <th className="p-3 text-center">T</th>
                                            <th className="p-3 text-center">W</th>
                                            <th className="p-3 text-center">T</th>
                                            <th className="p-3 text-center">F</th>
                                            <th className="p-3 text-center">S</th>
                                            <th className="p-3 text-center">S</th>
                                            <th className="p-3 text-center pr-6">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ts.entries.map((e: any, idx: number) => (
                                            <tr key={idx} className="border-b border-[var(--border-color)] last:border-0 hover:bg-white/50">
                                                <td className="p-3 pl-6">
                                                    <div className="text-xs font-bold">{e.project}</div>
                                                    <div className="text-[10px] text-[var(--text-muted)]">{e.taskName}</div>
                                                </td>
                                                <td className="p-3 text-center text-xs font-mono">{e.mon || '-'}</td>
                                                <td className="p-3 text-center text-xs font-mono">{e.tue || '-'}</td>
                                                <td className="p-3 text-center text-xs font-mono">{e.wed || '-'}</td>
                                                <td className="p-3 text-center text-xs font-mono">{e.thu || '-'}</td>
                                                <td className="p-3 text-center text-xs font-mono">{e.fri || '-'}</td>
                                                <td className="p-3 text-center text-xs font-mono text-[var(--text-muted)]">{e.sat || '-'}</td>
                                                <td className="p-3 text-center text-xs font-mono text-[var(--text-muted)]">{e.sun || '-'}</td>
                                                <td className="p-3 text-center font-bold text-[var(--primary)] pr-6">{e.total?.toFixed(1)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TimesheetApprovals;
