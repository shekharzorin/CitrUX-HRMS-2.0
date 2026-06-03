import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { useDepartmentsAdmin, useQueueMutations, useUsers, useRoles, useCategories, useCategoryMutations } from '../hooks';
import type { SupportDepartment } from '../types';

const userLabel = (u: any) => `${u.profile?.firstName ?? ''} ${u.profile?.lastName ?? ''}`.trim() || u.email || u.id;

// ── Category manager (queue-scoped, inline create/edit/soft-delete) ──────────
const CategoryManager = ({ deptId }: { deptId: string }) => {
    const { data: categories } = useCategories(deptId);
    const { create, update, remove } = useCategoryMutations(deptId);
    const [name, setName] = useState('');
    const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

    return (
        <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Categories</h3>
            <div className="space-y-1.5">
                {categories?.length === 0 && <p className="text-xs text-slate-400">No categories yet.</p>}
                {categories?.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                        {editing?.id === c.id ? (
                            <>
                                <input value={editing.name} onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                                    className="flex-1 px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                                <button className="text-xs text-primary" onClick={() => { update.mutate({ id: c.id, input: { name: editing.name } }); setEditing(null); }}>Save</button>
                                <button className="text-xs text-slate-400" onClick={() => setEditing(null)}>Cancel</button>
                            </>
                        ) : (
                            <>
                                <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{c.name}</span>
                                <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setEditing({ id: c.id, name: c.name })}>Edit</button>
                                <button className="text-xs text-red-500 hover:text-red-600" onClick={() => remove.mutate(c.id)}>Delete</button>
                            </>
                        )}
                    </div>
                ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) { create.mutate({ name: name.trim() }); setName(''); } }} className="flex gap-2 mt-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category"
                    className="flex-1 px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                <Button type="submit" variant="secondary" disabled={!name.trim() || create.isPending}>Add</Button>
            </form>
        </div>
    );
};

// ── Queue editor (create / edit) ─────────────────────────────────────────────
const blank = (): Partial<SupportDepartment> & { roleIds?: string[] } => ({ name: '', visibility: 'PUBLIC', sortOrder: 0, isActive: true, roleIds: [] });

const QueueEditor = ({ initial, onClose }: { initial: SupportDepartment | null; onClose: () => void }) => {
    const { create, update } = useQueueMutations();
    const { data: users } = useUsers();
    const { data: roles } = useRoles();
    const [form, setForm] = useState<any>(initial ? { ...initial, roleIds: (initial as any).visibleToRoles?.map((r: any) => r.accessRoleId) ?? [] } : blank());
    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name?.trim()) return;
        const payload = {
            name: form.name.trim(), description: form.description, icon: form.icon, color: form.color,
            visibility: form.visibility, defaultAssigneeId: form.defaultAssigneeId || null,
            sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive,
            roleIds: form.visibility === 'RESTRICTED' ? form.roleIds : [],
        };
        const cb = { onSuccess: onClose };
        if (initial) update.mutate({ id: initial.id, input: payload }, cb);
        else create.mutate(payload, cb);
    };

    return (
        <form onSubmit={save} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{initial ? 'Edit queue' : 'New queue'}</h3>
            <div className="grid grid-cols-2 gap-3">
                <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Name *" required className="col-span-2 px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                <input value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Description" className="col-span-2 px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                <input value={form.icon ?? ''} onChange={(e) => set('icon', e.target.value)} placeholder="Icon (emoji)" className="px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                <input value={form.color ?? ''} onChange={(e) => set('color', e.target.value)} placeholder="Color (#hex)" className="px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                <select value={form.visibility} onChange={(e) => set('visibility', e.target.value)} className="px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                    <option value="PUBLIC">Public (all employees)</option>
                    <option value="INTERNAL">Internal (agents)</option>
                    <option value="RESTRICTED">Restricted (roles)</option>
                </select>
                <input type="number" value={form.sortOrder ?? 0} onChange={(e) => set('sortOrder', e.target.value)} placeholder="Sort order" className="px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                <select value={form.defaultAssigneeId ?? ''} onChange={(e) => set('defaultAssigneeId', e.target.value)} className="col-span-2 px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                    <option value="">No default assignee</option>
                    {users?.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
                </select>
            </div>
            {form.visibility === 'RESTRICTED' && (
                <div>
                    <p className="text-xs text-slate-500 mb-1">Roles that can see/file into this queue:</p>
                    <div className="flex flex-wrap gap-2">
                        {roles?.map((r) => {
                            const checked = form.roleIds?.includes(r.id);
                            return (
                                <label key={r.id} className={`text-xs px-2 py-1 rounded-md border cursor-pointer ${checked ? 'bg-primary/10 border-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                                    <input type="checkbox" className="mr-1" checked={checked}
                                        onChange={() => set('roleIds', checked ? form.roleIds.filter((x: string) => x !== r.id) : [...(form.roleIds ?? []), r.id])} />
                                    {r.name}
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Active
            </label>
            <div className="flex gap-2">
                <Button type="submit" disabled={create.isPending || update.isPending}>{initial ? 'Save' : 'Create'}</Button>
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            </div>
        </form>
    );
};

const QueueAdmin = () => {
    const { data: queues, isLoading } = useDepartmentsAdmin();
    const { remove, restore } = useQueueMutations();
    const [editor, setEditor] = useState<SupportDepartment | 'new' | null>(null);
    const [catFor, setCatFor] = useState<string | null>(null);

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Support Queues</h1>
                <Button onClick={() => setEditor('new')}>New queue</Button>
            </div>

            {editor && <div className="mb-5"><QueueEditor initial={editor === 'new' ? null : editor} onClose={() => setEditor(null)} /></div>}

            {isLoading && <div className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />}
            {queues?.length === 0 && !isLoading && (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-slate-500 mb-3">No queues yet. Create one so employees have somewhere to file tickets.</p>
                    <Button onClick={() => setEditor('new')}>Create your first queue</Button>
                </div>
            )}

            <div className="space-y-2">
                {queues?.map((q) => (
                    <div key={q.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                                <p className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                    <span aria-hidden>{q.icon || '🛟'}</span>{q.name}
                                    {q.isSystem && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">SYSTEM</span>}
                                    {!q.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">INACTIVE</span>}
                                </p>
                                <p className="text-xs text-slate-400">{q.visibility} · {(q as any).userCount ?? 0} tickets</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm shrink-0">
                                <button className="text-slate-500 hover:text-slate-700" onClick={() => setCatFor(catFor === q.id ? null : q.id)}>Categories</button>
                                <button className="text-slate-500 hover:text-slate-700" onClick={() => setEditor(q)}>Edit</button>
                                {!q.isSystem && (
                                    <button className="text-red-500 hover:text-red-600" onClick={() => remove.mutate(q.id)}>Delete</button>
                                )}
                                <button className="text-emerald-600 hover:text-emerald-700" onClick={() => restore.mutate(q.id)}>Restore</button>
                            </div>
                        </div>
                        {catFor === q.id && <CategoryManager deptId={q.id} />}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QueueAdmin;
