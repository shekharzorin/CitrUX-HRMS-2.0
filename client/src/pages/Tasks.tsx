import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { PageHeader } from '../components/ui/PageHeader';
import { StatsCardPremium } from '../components/ui/DashboardElements';
import { format, parseISO } from 'date-fns';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
    createdAt: string;
}

const STATUS_META: Record<TaskStatus, { label: string; color: string; dot: string }> = {
    TODO: { label: 'To Do', color: 'bg-slate-100 text-slate-600 border border-slate-200', dot: 'bg-slate-400' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
    DONE: { label: 'Done', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' }
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
    LOW: { label: 'Low', color: 'text-slate-400' },
    MEDIUM: { label: 'Medium', color: 'text-amber-500' },
    HIGH: { label: 'High', color: 'text-rose-500' }
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
    TODO: 'IN_PROGRESS',
    IN_PROGRESS: 'DONE',
    DONE: 'TODO'
};

const emptyForm = {
    title: '',
    description: '',
    priority: 'MEDIUM' as TaskPriority,
    dueDate: ''
};

const TasksPage: React.FC = () => {
    const { showToast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [activeFilter, setActiveFilter] = useState<TaskStatus | 'ALL'>('ALL');

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get<Task[]>('/tasks');
            setTasks(data || []);
        } catch {
            showToast('Failed to load tasks', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const todoCount = tasks.filter(t => t.status === 'TODO').length;
    const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const doneCount = tasks.filter(t => t.status === 'DONE').length;

    const filtered = activeFilter === 'ALL' ? tasks : tasks.filter(t => t.status === activeFilter);

    // ── Cycle status ──────────────────────────────────────────────────────────
    const cycleStatus = async (task: Task) => {
        const next = NEXT_STATUS[task.status];
        try {
            const updated = await api.put<Task>(`/tasks/${task.id}`, { status: next });
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: updated.status } : t));
            showToast(`Moved to "${STATUS_META[next].label}"`, 'success');
        } catch {
            showToast('Failed to update status', 'error');
        }
    };

    // ── Modal helpers ─────────────────────────────────────────────────────────
    const openAdd = () => { setEditingTask(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (task: Task) => {
        setEditingTask(task);
        setForm({ title: task.title, description: task.description || '', priority: task.priority, dueDate: task.dueDate ? task.dueDate.split('T')[0] : '' });
        setShowModal(true);
    };
    const closeModal = () => { setShowModal(false); setEditingTask(null); };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { showToast('Task title is required', 'error'); return; }
        setSaving(true);
        try {
            const payload = { title: form.title.trim(), description: form.description.trim() || undefined, priority: form.priority, dueDate: form.dueDate || undefined };
            if (editingTask) {
                const updated = await api.put<Task>(`/tasks/${editingTask.id}`, payload);
                setTasks(prev => prev.map(t => t.id === editingTask.id ? updated : t));
                showToast('Task updated', 'success');
            } else {
                const created = await api.post<Task>('/tasks', payload);
                setTasks(prev => [created, ...prev]);
                showToast('Task created', 'success');
            }
            closeModal();
        } catch (err: any) {
            showToast(err.message || 'Failed to save task', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        if (!confirm('Delete this task?')) return;
        try {
            await api.delete(`/tasks/${id}`);
            setTasks(prev => prev.filter(t => t.id !== id));
            showToast('Task deleted', 'success');
        } catch {
            showToast('Failed to delete task', 'error');
        }
    };

    const safeDate = (d?: string) => {
        if (!d) return null;
        try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return d; }
    };

    const isOverdue = (dueDate?: string, status?: TaskStatus) => {
        if (!dueDate || status === 'DONE') return false;
        return new Date(dueDate) < new Date();
    };

    return (
        <div className="page-container">
            <PageHeader
                title="My Tasks"
                subtitle="Manage your personal work items and to-do list."
                icon="approvals"
                gradient="gradient-indigo"
                actions={
                    <button
                        id="add-task-btn"
                        onClick={openAdd}
                        className="px-6 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl backdrop-blur-md border border-white/30 transition-all flex items-center gap-2 shadow-lg"
                    >
                        <Icon name="plus" size={18} /> New Task
                    </button>
                }
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                <div onClick={() => setActiveFilter('TODO')} className="cursor-pointer">
                    <StatsCardPremium title="To Do" value={String(todoCount)} subtext="tasks pending" icon="file_text" variant="blue" />
                </div>
                <div onClick={() => setActiveFilter('IN_PROGRESS')} className="cursor-pointer">
                    <StatsCardPremium title="In Progress" value={String(inProgressCount)} subtext="tasks active" icon="bolt" variant="orange" />
                </div>
                <div onClick={() => setActiveFilter('DONE')} className="cursor-pointer">
                    <StatsCardPremium title="Done" value={String(doneCount)} subtext="tasks completed" icon="check_circle" variant="green" />
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap mb-6">
                {(['ALL', 'TODO', 'IN_PROGRESS', 'DONE'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                            activeFilter === f
                                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-light)] hover:border-slate-400'
                        }`}
                    >
                        {f === 'ALL' ? 'All Tasks' : f === 'IN_PROGRESS' ? 'In Progress' : f.charAt(0) + f.slice(1).toLowerCase()}
                        {f !== 'ALL' && <span className="ml-1.5 opacity-70">({f === 'TODO' ? todoCount : f === 'IN_PROGRESS' ? inProgressCount : doneCount})</span>}
                    </button>
                ))}
                {activeFilter !== 'ALL' && (
                    <button onClick={() => setActiveFilter('ALL')} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] ml-1 transition-colors">
                        Clear filter
                    </button>
                )}
            </div>

            {/* Task Cards */}
            {loading ? (
                <div className="flex flex-col items-center py-16 gap-3 text-[var(--text-muted)]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                    <span className="text-sm">Loading tasks...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel flex flex-col items-center py-16 gap-4 text-[var(--text-muted)]">
                    <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                        <Icon name="check_circle" size={40} />
                    </div>
                    <p className="font-bold text-[var(--text-main)]">
                        {activeFilter === 'ALL' ? 'No tasks yet' : `No "${STATUS_META[activeFilter as TaskStatus]?.label}" tasks`}
                    </p>
                    <p className="text-sm">
                        {activeFilter === 'ALL' ? 'Click "New Task" to create your first task.' : 'Switch the filter or add a new task.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(task => {
                        const meta = STATUS_META[task.status];
                        const priMeta = PRIORITY_META[task.priority];
                        const overdue = isOverdue(task.dueDate, task.status);
                        return (
                            <div key={task.id} className="glass-panel p-5 flex flex-col sm:flex-row sm:items-center gap-4 group hover:shadow-md transition-all">
                                {/* Status Cycle Button */}
                                <button
                                    onClick={() => cycleStatus(task)}
                                    title={`Mark as "${STATUS_META[NEXT_STATUS[task.status]].label}"`}
                                    aria-label={`Change task status from ${meta.label}`}
                                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                                        task.status === 'DONE' ? 'bg-emerald-500 border-emerald-500'
                                        : task.status === 'IN_PROGRESS' ? 'border-amber-400 bg-amber-50'
                                        : 'border-slate-300 hover:border-[var(--primary)]'
                                    }`}
                                >
                                    {task.status === 'DONE' && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                    {task.status === 'IN_PROGRESS' && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                                    )}
                                </button>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className={`text-sm font-bold ${task.status === 'DONE' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>
                                            {task.title}
                                        </span>
                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${meta.color}`}>
                                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${meta.dot}`} />
                                            {meta.label}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase ${priMeta.color}`}>
                                            ↑ {priMeta.label}
                                        </span>
                                    </div>
                                    {task.description && (
                                        <p className="text-xs text-[var(--text-muted)] truncate max-w-lg">{task.description}</p>
                                    )}
                                    {task.dueDate && (
                                        <p className={`text-[10px] font-bold mt-1 ${overdue ? 'text-rose-500' : 'text-[var(--text-muted)]'}`}>
                                            {overdue ? '⚠ Overdue · ' : '📅 '}Due {safeDate(task.dueDate)}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(task)} className="p-2 text-[var(--text-muted)] hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit task" aria-label={`Edit task: ${task.title}`}>
                                        <Icon name="edit" size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(task.id)} className="p-2 text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete task" aria-label={`Delete task: ${task.title}`}>
                                        <Icon name="delete" size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[var(--bg-surface)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[var(--border-light)]">
                        <div className="p-6 border-b border-[var(--border-light)] flex justify-between items-center">
                            <h3 className="font-bold text-lg text-[var(--text-main)]">{editingTask ? 'Edit Task' : 'New Task'}</h3>
                            <button onClick={closeModal} className="text-[var(--text-muted)] hover:text-[var(--text-main)]" aria-label="Close modal">
                                <Icon name="close" size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="form-label" htmlFor="task-title">Task Title *</label>
                                <input id="task-title" type="text" required className="input-field" placeholder="What needs to be done?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} aria-label="Task title" autoFocus />
                            </div>

                            <div>
                                <label className="form-label" htmlFor="task-desc">Description</label>
                                <textarea id="task-desc" rows={2} className="input-field" placeholder="Optional details..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} aria-label="Task description" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label" htmlFor="task-priority">Priority</label>
                                    <select id="task-priority" className="input-field" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority })} aria-label="Task priority">
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label" htmlFor="task-due">Due Date</label>
                                    <input id="task-due" type="date" className="input-field" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} aria-label="Task due date" />
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={closeModal} className="btn-ghost flex-1">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                                    {saving ? (
                                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                                    ) : (
                                        <><Icon name="save" size={16} /> {editingTask ? 'Update' : 'Create Task'}</>
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

export default TasksPage;
