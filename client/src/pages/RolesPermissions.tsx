import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { Button } from '../components/ui/Button';
import ConfirmModal from '../components/ConfirmModal';

interface AccessRole {
    id: string;
    name: string;
    description?: string | null;
    isSystem: boolean;
    isOwner: boolean;
    userCount: number;
    permissions: string[];
}

const toast = (message: string, type: 'success' | 'error' = 'success') =>
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));

const humanize = (p: string) =>
    p.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

interface Draft {
    id?: string;
    name: string;
    description: string;
    permissions: Set<string>;
    isOwner: boolean;
    isSystem: boolean;
}

const blankDraft = (): Draft => ({ name: '', description: '', permissions: new Set(), isOwner: false, isSystem: false });

const RolesPermissions: React.FC = () => {
    const [catalog, setCatalog] = useState<string[]>([]);
    const [roles, setRoles] = useState<AccessRole[]>([]);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toDelete, setToDelete] = useState<AccessRole | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [cat, list] = await Promise.all([
                api.get<{ permissions: string[] }>('/roles/catalog'),
                api.get<AccessRole[]>('/roles'),
            ]);
            setCatalog(cat.permissions);
            setRoles(list);
        } catch {
            /* api shows the error toast */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const selectRole = (r: AccessRole) => {
        setIsNew(false);
        setDraft({
            id: r.id,
            name: r.name,
            description: r.description || '',
            permissions: new Set(r.permissions),
            isOwner: r.isOwner,
            isSystem: r.isSystem,
        });
    };

    const startNew = () => { setIsNew(true); setDraft(blankDraft()); };

    const togglePerm = (p: string) => {
        if (!draft || draft.isOwner) return;
        const next = new Set(draft.permissions);
        next.has(p) ? next.delete(p) : next.add(p);
        setDraft({ ...draft, permissions: next });
    };

    const save = async () => {
        if (!draft) return;
        if (!draft.name.trim()) { toast('Role name is required', 'error'); return; }
        setSaving(true);
        try {
            const body = {
                name: draft.name.trim(),
                description: draft.description,
                permissions: Array.from(draft.permissions),
            };
            if (isNew) {
                await api.post('/roles', body);
                toast('Role created');
            } else {
                await api.put(`/roles/${draft.id}`, body);
                toast('Role updated');
            }
            setDraft(null);
            setIsNew(false);
            await load();
        } catch {
            /* error toast handled globally */
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        try {
            await api.delete(`/roles/${toDelete.id}`);
            toast('Role deleted');
            if (draft?.id === toDelete.id) setDraft(null);
            await load();
        } catch {
            /* error toast handled globally */
        } finally {
            setToDelete(null);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles & Permissions</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Define roles and what each can do in your company.</p>
                </div>
                <Button onClick={startNew}><Icon name="plus" className="w-4 h-4 mr-1" /> New Role</Button>
            </div>

            {loading ? (
                <div className="text-slate-500 dark:text-slate-400">Loading…</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Roles list */}
                    <div className="md:col-span-1 space-y-2">
                        {roles.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => selectRole(r)}
                                className={`w-full text-left p-3 rounded-lg border transition ${
                                    draft?.id === r.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-slate-900 dark:text-white">{r.name}</span>
                                    <div className="flex gap-1">
                                        {r.isOwner && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">OWNER</span>}
                                        {r.isSystem && !r.isOwner && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">SYSTEM</span>}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {r.permissions.length} permission{r.permissions.length !== 1 ? 's' : ''} · {r.userCount} user{r.userCount !== 1 ? 's' : ''}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Editor */}
                    <div className="md:col-span-2">
                        {!draft ? (
                            <div className="h-full flex items-center justify-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-10">
                                Select a role to edit, or create a new one.
                            </div>
                        ) : (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-5">
                                {draft.isOwner && (
                                    <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                                        The owner role always holds every permission and cannot be edited.
                                    </div>
                                )}
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                                <input
                                    value={draft.name}
                                    disabled={draft.isOwner}
                                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                                    className="w-full mb-3 px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
                                    placeholder="e.g. Recruiter"
                                />
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <input
                                    value={draft.description}
                                    disabled={draft.isOwner}
                                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                                    className="w-full mb-4 px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
                                    placeholder="What this role is for"
                                />

                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Permissions ({draft.permissions.size})</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-80 overflow-y-auto pr-1">
                                    {catalog.map((p) => {
                                        const checked = draft.isOwner || draft.permissions.has(p);
                                        return (
                                            <label key={p} className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded ${draft.isOwner ? 'opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={draft.isOwner}
                                                    onChange={() => togglePerm(p)}
                                                />
                                                <span className="text-slate-700 dark:text-slate-300">{humanize(p)}</span>
                                            </label>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between mt-5">
                                    <div>
                                        {draft.id && !draft.isOwner && !draft.isSystem && (
                                            <button
                                                onClick={() => { const r = roles.find((x) => x.id === draft.id); if (r) setToDelete(r); }}
                                                className="text-sm text-red-600 hover:text-red-700"
                                            >
                                                Delete role
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" onClick={() => { setDraft(null); setIsNew(false); }}>Cancel</Button>
                                        {!draft.isOwner && <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!toDelete}
                title="Delete role?"
                message={`Delete "${toDelete?.name}"? This cannot be undone.`}
                onConfirm={confirmDelete}
                onClose={() => setToDelete(null)}
            />
        </div>
    );
};

export default RolesPermissions;
