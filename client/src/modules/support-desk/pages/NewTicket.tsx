import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { useDepartments, useCategories, useCreateTicket } from '../hooks';
import type { SupportDepartment } from '../types';

// Service-tile selection — the mobile-first, conversational entry point.
const ServiceTileGrid = ({ onPick }: { onPick: (d: SupportDepartment) => void }) => {
    const { data: queues, isLoading } = useDepartments();
    if (isLoading) {
        return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}</div>;
    }
    if (!queues?.length) return <p className="text-sm text-slate-500">No support queues are available yet.</p>;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {queues.map((q) => (
                <button
                    key={q.id}
                    onClick={() => onPick(q)}
                    className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary hover:shadow-sm transition text-center min-h-[7rem]"
                    style={q.color ? { borderTopColor: q.color, borderTopWidth: 3 } : undefined}
                >
                    <span className="text-2xl" aria-hidden>{q.icon || '🛟'}</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{q.name}</span>
                </button>
            ))}
        </div>
    );
};

const NewTicket = () => {
    const navigate = useNavigate();
    const [queue, setQueue] = useState<SupportDepartment | null>(null);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const { data: categories } = useCategories(queue?.id);
    const createTicket = useCreateTicket();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!queue || !subject.trim() || !description.trim()) return;
        createTicket.mutate(
            { subject: subject.trim(), description: description.trim(), supportDepartmentId: queue.id, categoryId: categoryId || undefined, files },
            { onSuccess: (t: any) => navigate(`/support/tickets/${t.id}`) },
        );
    };

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-1">How can we help?</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                {queue ? `Raising a ticket in ${queue.name}` : 'Pick the area you need help with.'}
            </p>

            {!queue ? (
                <ServiceTileGrid onPick={setQueue} />
            ) : (
                <form onSubmit={submit} className="space-y-4">
                    <button type="button" onClick={() => setQueue(null)} className="text-xs text-primary hover:underline">← Choose a different area</button>
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">What’s the issue?</label>
                        <input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="Short summary"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tell us more</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} placeholder="Describe what’s happening…"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                    </div>
                    {categories && categories.length > 0 && (
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category (optional)</label>
                            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                                <option value="">Let us figure it out</option>
                                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    <label className="block text-sm text-slate-500 cursor-pointer">
                        📎 Attach files (optional)
                        <input type="file" multiple accept="image/*,application/pdf" className="hidden"
                            onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                        {files.length > 0 && <span className="ml-2 text-xs text-slate-400">{files.length} selected</span>}
                    </label>
                    <Button type="submit" disabled={createTicket.isPending}>{createTicket.isPending ? 'Submitting…' : 'Submit ticket'}</Button>
                </form>
            )}
        </div>
    );
};

export default NewTicket;
