import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { PageHeader } from '../components/ui/PageHeader';
import { StatsCardPremium } from '../components/ui/DashboardElements';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

interface UserProfile {
    firstName: string;
    lastName: string;
}

interface Task {
    id: string;
    userId?: string;
    creatorId?: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
    completionComment?: string;
    createdAt: string;
    creator?: { profile: UserProfile };
    user?: { profile: UserProfile };
}

const STATUS_META: Record<TaskStatus, { label: string; color: string; dot: string }> = {
    TODO: { label: 'To Do', color: 'bg-slate-100 text-slate-600 border border-slate-200', dot: 'bg-slate-400' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
    IN_REVIEW: { label: 'In Review', color: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500' },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' }
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
    LOW: { label: 'Low', color: 'text-slate-400' },
    MEDIUM: { label: 'Medium', color: 'text-amber-500' },
    HIGH: { label: 'High', color: 'text-rose-500' }
};

const emptyForm = {
    title: '',
    description: '',
    priority: 'MEDIUM' as TaskPriority,
    dueDate: '',
    assignedTo: ''
};

const TasksPage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    
    const [viewMode, setViewMode] = useState<'MY_TASKS' | 'TEAM_TASKS'>('MY_TASKS');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [teamTasks, setTeamTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [commentTask, setCommentTask] = useState<{task: Task, nextStatus: TaskStatus} | null>(null);
    const [completionComment, setCompletionComment] = useState('');
    
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [activeFilter, setActiveFilter] = useState<TaskStatus | 'ALL'>('ALL');

    const isManager = ['MANAGER', 'ADMIN', 'HR', 'SUPER_ADMIN'].includes(user?.role || '');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const myData = await api.get<Task[]>('/tasks');
            setTasks(myData || []);

            if (isManager) {
                const teamData = await api.get<Task[]>('/tasks/team');
                setTeamTasks(teamData || []);
                
                const usersData = await api.get<any[]>('/users');
                setUsers(usersData || []);
            }
        } catch {
            showToast('Failed to load tasks', 'error');
        } finally {
            setLoading(false);
        }
    }, [isManager]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const activeTasks = viewMode === 'MY_TASKS' ? tasks : teamTasks;
    const todoCount = activeTasks.filter(t => t.status === 'TODO').length;
    const inProgressCount = activeTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const inReviewCount = activeTasks.filter(t => t.status === 'IN_REVIEW').length;
    const doneCount = activeTasks.filter(t => t.status === 'COMPLETED').length;

    const filtered = activeFilter === 'ALL' ? activeTasks : activeTasks.filter(t => t.status === activeFilter);

    // ── Cycle status ──────────────────────────────────────────────────────────
    const handleStatusChange = (task: Task) => {
        const isPersonal = task.creatorId === task.userId;
        const isAssignee = task.userId === user?.id;
        const isCreator = task.creatorId === user?.id;

        let nextStatus: TaskStatus = 'TODO';

        if (isPersonal) {
            if (task.status === 'TODO') nextStatus = 'IN_PROGRESS';
            else if (task.status === 'IN_PROGRESS') nextStatus = 'COMPLETED';
            else if (task.status === 'COMPLETED') nextStatus = 'TODO';
        } else {
            if (isAssignee && !isCreator) {
                // Assignee can only move to IN_REVIEW
                if (task.status === 'TODO') nextStatus = 'IN_PROGRESS';
                else if (task.status === 'IN_PROGRESS') nextStatus = 'IN_REVIEW';
                else if (task.status === 'IN_REVIEW') return showToast('Waiting for manager approval', 'error');
                else return; // Completed
            } else if (isCreator && !isAssignee) {
                // Manager can approve or reject
                if (task.status === 'IN_REVIEW') {
                    // We will show a custom prompt to select COMPLETED or TODO
                    setCommentTask({ task, nextStatus: 'COMPLETED' });
                    setCompletionComment(task.completionComment || '');
                    setShowCommentModal(true);
                    return;
                }
                if (task.status === 'TODO') nextStatus = 'IN_PROGRESS';
                else if (task.status === 'IN_PROGRESS') nextStatus = 'COMPLETED';
                else if (task.status === 'COMPLETED') nextStatus = 'TODO';
            } else {
                return;
            }
        }

        if (nextStatus === 'IN_REVIEW' || nextStatus === 'COMPLETED') {
            setCommentTask({ task, nextStatus });
            setCompletionComment(task.completionComment || '');
            setShowCommentModal(true);
        } else {
            updateTaskStatus(task.id, nextStatus);
        }
    };

    const updateTaskStatus = async (taskId: string, status: TaskStatus, comment?: string) => {
        try {
            const payload: any = { status };
            if (comment) payload.completionComment = comment;

            const updated = await api.put<Task>(`/tasks/${taskId}`, payload);
            
            // Update local state
            setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
            setTeamTasks(prev => prev.map(t => t.id === taskId ? updated : t));
            
            showToast(`Task moved to ${STATUS_META[status].label}`, 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to update status', 'error');
        }
    };

    const submitCommentModal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!completionComment.trim()) {
            showToast('Comment is mandatory for this action', 'error');
            return;
        }
        if (commentTask) {
            updateTaskStatus(commentTask.task.id, commentTask.nextStatus, completionComment.trim());
        }
        setShowCommentModal(false);
        setCommentTask(null);
        setCompletionComment('');
    };

    // ── Modal helpers ─────────────────────────────────────────────────────────
    const openAdd = () => { setEditingTask(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (task: Task) => {
        setEditingTask(task);
        setForm({ 
            title: task.title, 
            description: task.description || '', 
            priority: task.priority, 
            dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
            assignedTo: task.userId || ''
        });
        setShowModal(true);
    };
    const closeModal = () => { setShowModal(false); setEditingTask(null); };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { showToast('Task title is required', 'error'); return; }
        if (!form.dueDate) { showToast('Due date is mandatory', 'error'); return; }

        setSaving(true);
        try {
            const payload: any = { 
                title: form.title.trim(), 
                description: form.description.trim() || undefined, 
                priority: form.priority, 
                dueDate: form.dueDate 
            };
            if (isManager && form.assignedTo) {
                payload.assignedTo = form.assignedTo;
            }

            if (editingTask) {
                const updated = await api.put<Task>(`/tasks/${editingTask.id}`, payload);
                setTasks(prev => prev.map(t => t.id === editingTask.id ? updated : t));
                setTeamTasks(prev => prev.map(t => t.id === editingTask.id ? updated : t));
                showToast('Task updated', 'success');
            } else {
                const created = await api.post<Task>('/tasks', payload);
                if (created.userId === user?.id) {
                    setTasks(prev => [created, ...prev]);
                } else {
                    setTeamTasks(prev => [created, ...prev]);
                }
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
    const handleDelete = async (task: Task) => {
        if (!confirm('Delete this task?')) return;
        try {
            await api.delete(`/tasks/${task.id}`);
            setTasks(prev => prev.filter(t => t.id !== task.id));
            setTeamTasks(prev => prev.filter(t => t.id !== task.id));
            showToast('Task deleted', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to delete task', 'error');
        }
    };

    const safeDate = (d?: string) => {
        if (!d) return null;
        try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return d; }
    };

    const isOverdue = (dueDate?: string, status?: TaskStatus) => {
        if (!dueDate || status === 'COMPLETED') return false;
        return new Date(dueDate) < new Date();
    };

    return (
        <div className="page-container">
            <PageHeader
                title="Task Management"
                subtitle="Manage personal and team tasks, assignments, and priorities."
                icon="approvals"
                gradient="gradient-indigo"
                actions={
                    <button
                        onClick={openAdd}
                        className="px-6 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl backdrop-blur-md border border-white/30 transition-all flex items-center gap-2 shadow-lg"
                    >
                        <Icon name="plus" size={18} /> New Task
                    </button>
                }
            />

            {isManager && (
                <div className="flex mb-6 border-b border-slate-200">
                    <button
                        onClick={() => setViewMode('MY_TASKS')}
                        className={`py-3 px-6 font-bold text-sm transition-all border-b-2 ${viewMode === 'MY_TASKS' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        My Tasks
                    </button>
                    <button
                        onClick={() => setViewMode('TEAM_TASKS')}
                        className={`py-3 px-6 font-bold text-sm transition-all border-b-2 ${viewMode === 'TEAM_TASKS' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        Team Tasks
                    </button>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
                <div onClick={() => setActiveFilter('TODO')} className="cursor-pointer">
                    <StatsCardPremium title="To Do" value={String(todoCount)} subtext="pending" icon="file_text" variant="blue" />
                </div>
                <div onClick={() => setActiveFilter('IN_PROGRESS')} className="cursor-pointer">
                    <StatsCardPremium title="In Progress" value={String(inProgressCount)} subtext="active" icon="bolt" variant="orange" />
                </div>
                <div onClick={() => setActiveFilter('IN_REVIEW')} className="cursor-pointer">
                    <StatsCardPremium title="In Review" value={String(inReviewCount)} subtext="awaiting approval" icon="search" variant="purple" />
                </div>
                <div onClick={() => setActiveFilter('COMPLETED')} className="cursor-pointer">
                    <StatsCardPremium title="Completed" value={String(doneCount)} subtext="finished" icon="check_circle" variant="green" />
                </div>
            </div>

            {/* Task Cards */}
            {loading ? (
                <div className="flex flex-col items-center py-16 gap-3 text-slate-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                    <span className="text-sm">Loading tasks...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel flex flex-col items-center py-16 gap-4 text-slate-500">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                        <Icon name="check_circle" size={40} />
                    </div>
                    <p className="font-bold text-slate-800">
                        {activeFilter === 'ALL' ? 'No tasks yet' : `No "${STATUS_META[activeFilter as TaskStatus]?.label}" tasks`}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(task => {
                        const meta = STATUS_META[task.status];
                        const priMeta = PRIORITY_META[task.priority];
                        const overdue = isOverdue(task.dueDate, task.status);
                        const isCreator = task.creatorId === user?.id;
                        
                        return (
                            <div key={task.id} className="glass-panel p-5 flex flex-col sm:flex-row sm:items-center gap-4 group hover:shadow-md transition-all border border-slate-100">
                                {/* Status Cycle Button */}
                                <button
                                    onClick={() => handleStatusChange(task)}
                                    title="Change Status"
                                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                                        task.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-500'
                                        : task.status === 'IN_PROGRESS' ? 'border-amber-400 bg-amber-50'
                                        : task.status === 'IN_REVIEW' ? 'border-blue-400 bg-blue-50'
                                        : 'border-slate-300 hover:border-indigo-500'
                                    }`}
                                >
                                    {task.status === 'COMPLETED' && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                    {task.status === 'IN_PROGRESS' && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                                    )}
                                    {task.status === 'IN_REVIEW' && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                    )}
                                </button>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className={`text-sm font-bold ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
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
                                        <p className="text-xs text-slate-500 truncate max-w-lg mb-1">{task.description}</p>
                                    )}
                                    <div className="flex gap-4 items-center mt-1">
                                        {task.dueDate && (
                                            <p className={`text-[10px] font-bold ${overdue ? 'text-rose-500' : 'text-slate-400'}`}>
                                                {overdue ? '⚠ Overdue · ' : '📅 '}Due {safeDate(task.dueDate)}
                                            </p>
                                        )}
                                        {viewMode === 'TEAM_TASKS' && task.user && (
                                            <p className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 rounded-full">
                                                Assigned to: {task.user.profile.firstName} {task.user.profile.lastName}
                                            </p>
                                        )}
                                    </div>
                                    {task.completionComment && (
                                        <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 border border-slate-100">
                                            <strong>Comment:</strong> {task.completionComment}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    {(isCreator || task.userId === user?.id) && (
                                        <button onClick={() => openEdit(task)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit task">
                                            <Icon name="edit" size={16} />
                                        </button>
                                    )}
                                    {(isCreator || (task.creatorId === task.userId && task.userId === user?.id)) && (
                                        <button onClick={() => handleDelete(task)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete task">
                                            <Icon name="delete" size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">{editingTask ? 'Edit Task' : 'New Task'}</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-800" aria-label="Close modal">
                                <Icon name="close" size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="form-label" htmlFor="task-title">Task Title *</label>
                                <input id="task-title" type="text" required className="input-field" placeholder="What needs to be done?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
                            </div>

                            <div>
                                <label className="form-label" htmlFor="task-desc">Description</label>
                                <textarea id="task-desc" rows={2} className="input-field" placeholder="Optional details..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label" htmlFor="task-priority">Priority</label>
                                    <select id="task-priority" className="input-field" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority })}>
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label" htmlFor="task-due">Due Date *</label>
                                    <input id="task-due" type="date" required className="input-field" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                                </div>
                            </div>
                            
                            {isManager && (
                                <div>
                                    <label className="form-label" htmlFor="task-assign">Assign To (Optional)</label>
                                    <select id="task-assign" className="input-field" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
                                        <option value={user?.id || ''}>Myself (Personal Task)</option>
                                        {users.filter(u => u.id !== user?.id).map(u => (
                                            <option key={u.id} value={u.id}>{u.profile?.firstName} {u.profile?.lastName}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={closeModal} className="btn-ghost flex-1">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                                    {saving ? 'Saving...' : (editingTask ? 'Update' : 'Create Task')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Comment Modal */}
            {showCommentModal && commentTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="font-bold text-lg text-slate-800">
                                {commentTask.task.creatorId !== commentTask.task.userId && commentTask.task.creatorId === user?.id && commentTask.task.status === 'IN_REVIEW' ? 'Review Task' : 'Submit Task'}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                {commentTask.task.creatorId !== commentTask.task.userId && commentTask.task.creatorId === user?.id && commentTask.task.status === 'IN_REVIEW' 
                                    ? 'Approve this task or send it back.'
                                    : 'Please provide a completion comment before submitting.'}
                            </p>
                        </div>
                        <form onSubmit={submitCommentModal} className="p-6 space-y-4">
                            <div>
                                <label className="form-label">Completion Comment *</label>
                                <textarea 
                                    className="input-field" 
                                    rows={3} 
                                    required 
                                    placeholder="Summarize the work done..."
                                    value={completionComment}
                                    onChange={e => setCompletionComment(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            
                            {commentTask.task.creatorId !== commentTask.task.userId && commentTask.task.creatorId === user?.id && commentTask.task.status === 'IN_REVIEW' ? (
                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => {
                                        if(!completionComment) return showToast('Comment required to reject', 'error');
                                        updateTaskStatus(commentTask.task.id, 'TODO', completionComment);
                                        setShowCommentModal(false);
                                    }} className="flex-1 py-2 rounded-lg bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 transition-colors">
                                        Reject (Reopen)
                                    </button>
                                    <button type="submit" className="flex-1 py-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors">
                                        Approve
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => setShowCommentModal(false)} className="btn-ghost flex-1">Cancel</button>
                                    <button type="submit" className="btn-primary flex-1">Submit</button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksPage;
