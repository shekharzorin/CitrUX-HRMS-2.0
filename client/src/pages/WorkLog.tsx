import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { PageHeader } from '../components/ui/PageHeader';
import { StatsCardPremium } from '../components/ui/DashboardElements';
import { format, parseISO } from 'date-fns';

interface WorkLog {
    id: string;
    date: string;
    hoursWorked: number;
    breakTime: number;
    description: string;
    createdAt: string;
}

const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    hoursWorked: '',
    breakTime: '',
    description: ''
};

const WorkLogPage: React.FC = () => {
    const { showToast } = useToast();
    const [logs, setLogs] = useState<WorkLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get<WorkLog[]>('/worklogs');
            setLogs(data || []);
        } catch {
            showToast('Failed to load work logs', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const now = new Date();
    const monthLogs = logs.filter(l => {
        const d = new Date(l.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalHoursMonth = monthLogs.reduce((sum, l) => sum + l.hoursWorked, 0);
    const avgHours = monthLogs.length > 0 ? (totalHoursMonth / monthLogs.length) : 0;
    const daysLogged = monthLogs.length;

    // ── Modal helpers ─────────────────────────────────────────────────────────
    const openAdd = () => {
        setEditingLog(null);
        setForm({ ...emptyForm, date: new Date().toISOString().split('T')[0] });
        setShowModal(true);
    };

    const openEdit = (log: WorkLog) => {
        setEditingLog(log);
        setForm({
            date: log.date.split('T')[0],
            hoursWorked: String(log.hoursWorked),
            breakTime: String(log.breakTime),
            description: log.description
        });
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingLog(null); };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const hours = parseFloat(form.hoursWorked);
        if (!form.date || isNaN(hours) || !form.description.trim()) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        if (hours < 0 || hours > 24) {
            showToast('Hours worked must be between 0 and 24', 'error');
            return;
        }
        setSaving(true);
        try {
            if (editingLog) {
                await api.put(`/worklogs/${editingLog.id}`, {
                    hoursWorked: hours,
                    breakTime: parseFloat(form.breakTime) || 0,
                    description: form.description
                });
                showToast('Work log updated', 'success');
            } else {
                await api.post('/worklogs', {
                    date: form.date,
                    hoursWorked: hours,
                    breakTime: parseFloat(form.breakTime) || 0,
                    description: form.description
                });
                showToast('Work log saved', 'success');
            }
            closeModal();
            fetchLogs();
        } catch (err: any) {
            showToast(err.message || 'Failed to save work log', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        if (!confirm('Delete this work log?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/worklogs/${id}`);
            setLogs(prev => prev.filter(l => l.id !== id));
            showToast('Work log deleted', 'success');
        } catch {
            showToast('Failed to delete', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const safeDate = (d: string) => {
        try { return format(parseISO(d), 'EEE, dd MMM yyyy'); } catch { return d; }
    };

    const hoursColor = (h: number) => {
        if (h >= 8) return 'text-emerald-600';
        if (h >= 5) return 'text-amber-600';
        return 'text-rose-600';
    };

    return (
        <div className="page-container">
            <PageHeader
                title="Work Log"
                subtitle="Track your daily work hours and activity descriptions."
                icon="timesheet"
                gradient="gradient-ocean"
                actions={
                    <button
                        id="add-work-log-btn"
                        onClick={openAdd}
                        className="px-6 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl backdrop-blur-md border border-white/30 transition-all flex items-center gap-2 shadow-lg"
                    >
                        <Icon name="plus" size={18} /> Log Today's Work
                    </button>
                }
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                <StatsCardPremium
                    title="Total Hours"
                    value={`${totalHoursMonth.toFixed(1)}h`}
                    subtext="This month"
                    icon="schedule"
                    variant="blue"
                />
                <StatsCardPremium
                    title="Avg Hours / Day"
                    value={`${avgHours.toFixed(1)}h`}
                    subtext="This month"
                    icon="trending_up"
                    variant="green"
                />
                <StatsCardPremium
                    title="Days Logged"
                    value={String(daysLogged)}
                    subtext="This month"
                    icon="event"
                    variant="purple"
                />
            </div>

            {/* Log Table */}
            <div className="glass-panel overflow-hidden">
                <div className="p-6 border-b border-[var(--border-light)] flex justify-between items-center">
                    <h3 className="font-bold text-[var(--text-main)] m-0">Recent Work Logs</h3>
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        {logs.length} entries
                    </span>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 flex flex-col items-center text-slate-400 gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                            <span className="text-sm font-medium">Loading...</span>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
                            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                                <Icon name="file_text" size={40} />
                            </div>
                            <p className="font-bold text-slate-700">No work logs yet</p>
                            <p className="text-sm">Click "Log Today's Work" to get started.</p>
                        </div>
                    ) : (
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th className="text-center">Hours Worked</th>
                                    <th className="text-center">Break (min)</th>
                                    <th>Description</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className="group">
                                        <td className="font-bold text-[var(--text-main)]">
                                            {safeDate(log.date)}
                                        </td>
                                        <td className="text-center">
                                            <span className={`text-lg font-black font-mono ${hoursColor(log.hoursWorked)}`}>
                                                {log.hoursWorked.toFixed(1)}h
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <span className="text-sm text-[var(--text-muted)] font-mono">
                                                {log.breakTime > 0 ? `${log.breakTime}m` : '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <p className="text-sm text-[var(--text-muted)] max-w-xs truncate" title={log.description}>
                                                {log.description}
                                            </p>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEdit(log)}
                                                    className="p-2 text-[var(--text-muted)] hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="Edit"
                                                    aria-label="Edit work log"
                                                >
                                                    <Icon name="edit" size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(log.id)}
                                                    disabled={deletingId === log.id}
                                                    className="p-2 text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                                                    title="Delete"
                                                    aria-label="Delete work log"
                                                >
                                                    <Icon name="delete" size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[var(--bg-surface)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[var(--border-light)]">
                        <div className="p-6 border-b border-[var(--border-light)] flex justify-between items-center">
                            <h3 className="font-bold text-lg text-[var(--text-main)]">
                                {editingLog ? 'Edit Work Log' : 'Log Work'}
                            </h3>
                            <button onClick={closeModal} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors" aria-label="Close modal">
                                <Icon name="close" size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="form-label" htmlFor="wl-date">Date</label>
                                <input
                                    id="wl-date"
                                    type="date"
                                    required
                                    className="input-field"
                                    value={form.date}
                                    max={new Date().toISOString().split('T')[0]}
                                    disabled={!!editingLog}
                                    onChange={e => setForm({ ...form, date: e.target.value })}
                                    aria-label="Work log date"
                                />
                                {editingLog && (
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1">Date cannot be changed after creation.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label" htmlFor="wl-hours">Hours Worked *</label>
                                    <input
                                        id="wl-hours"
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="24"
                                        required
                                        placeholder="8"
                                        className="input-field font-mono"
                                        value={form.hoursWorked}
                                        onChange={e => setForm({ ...form, hoursWorked: e.target.value })}
                                        aria-label="Hours worked"
                                    />
                                </div>
                                <div>
                                    <label className="form-label" htmlFor="wl-break">Break Time (min)</label>
                                    <input
                                        id="wl-break"
                                        type="number"
                                        step="5"
                                        min="0"
                                        placeholder="30"
                                        className="input-field font-mono"
                                        value={form.breakTime}
                                        onChange={e => setForm({ ...form, breakTime: e.target.value })}
                                        aria-label="Break time in minutes"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="form-label" htmlFor="wl-desc">Description *</label>
                                <textarea
                                    id="wl-desc"
                                    required
                                    rows={3}
                                    className="input-field"
                                    placeholder="What did you work on today?"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    aria-label="Work description"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={closeModal} className="btn-ghost flex-1">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                                    ) : (
                                        <><Icon name="save" size={16} /> {editingLog ? 'Update' : 'Save Log'}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkLogPage;
