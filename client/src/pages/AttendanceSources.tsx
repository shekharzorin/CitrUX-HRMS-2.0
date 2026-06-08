import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';

// ── Types mirror the backend catalog + serializer ────────────────────────────
interface ConfigField {
    key: string;
    label: string;
    type: 'text' | 'number' | 'password' | 'select' | 'boolean' | 'url';
    required?: boolean;
    secret?: boolean;
    options?: { value: string; label: string }[];
    placeholder?: string;
    help?: string;
    default?: string | number | boolean;
}
interface SourceTypeDescriptor {
    type: string;
    label: string;
    category: string;
    ingestionMode: string;
    needsConnectorAgent: boolean;
    supportsRealtime: boolean;
    description: string;
    configFields: ConfigField[];
    ingestionReady: boolean;
}
interface AttendanceSource {
    id: string;
    name: string;
    type: string;
    ingestionMode: string;
    isActive: boolean;
    priority: number;
    healthStatus: string;
    configuration: Record<string, any>;
    secretsSet: Record<string, boolean>;
    createdAt: string;
    updatedAt: string;
}

const toast = (message: string, type: 'success' | 'error' = 'success') =>
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));

// ── Source editor (create / edit) ────────────────────────────────────────────
const SourceEditor = ({ initial, types, onClose, onSaved }: {
    initial: AttendanceSource | null;
    types: SourceTypeDescriptor[];
    onClose: () => void;
    onSaved: () => void;
}) => {
    const [typeKey, setTypeKey] = useState(initial?.type || types[0]?.type || '');
    const descriptor = types.find((t) => t.type === typeKey);
    const [name, setName] = useState(initial?.name || '');
    const [priority, setPriority] = useState<number>(initial?.priority ?? 0);
    const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true);
    const [config, setConfig] = useState<Record<string, any>>(initial?.configuration || {});
    const [saving, setSaving] = useState(false);

    const setField = (k: string, v: any) => setConfig((c) => ({ ...c, [k]: v }));

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { toast('Name is required', 'error'); return; }
        setSaving(true);
        try {
            const payload: any = { name: name.trim(), priority: Number(priority) || 0, isActive, configuration: config };
            if (initial) {
                await api.put(`/attendance-sources/${initial.id}`, payload);
                toast('Attendance source updated');
            } else {
                await api.post('/attendance-sources', { ...payload, type: typeKey });
                toast('Attendance source added');
            }
            onSaved();
        } catch {
            /* api service already shows an error toast */
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={save} className="glass-panel p-5 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 dark:text-white">{initial ? 'Edit source' : 'Add attendance source'}</h3>
                {descriptor?.needsConnectorAgent && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Needs Connector Agent</span>
                )}
            </div>

            {!initial && (
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Method</label>
                    <select value={typeKey} onChange={(e) => { setTypeKey(e.target.value); setConfig({}); }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
                        {types.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                    </select>
                </div>
            )}
            {descriptor && <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">{descriptor.description}</p>}

            <div className="grid sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lobby ZKTeco" required
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Priority</label>
                    <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                </div>
            </div>

            {/* capability-driven config fields */}
            {descriptor && descriptor.configFields.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-3">
                    {descriptor.configFields.map((f) => {
                        const val = config[f.key];
                        const secretSet = initial?.secretsSet?.[f.key];
                        if (f.type === 'boolean') {
                            return (
                                <label key={f.key} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 sm:col-span-2">
                                    <input type="checkbox" checked={val ?? !!f.default} onChange={(e) => setField(f.key, e.target.checked)} />
                                    {f.label}
                                </label>
                            );
                        }
                        if (f.type === 'select') {
                            return (
                                <div key={f.key}>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{f.label}</label>
                                    <select value={val ?? f.default ?? ''} onChange={(e) => setField(f.key, e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
                                        {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                            );
                        }
                        return (
                            <div key={f.key}>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{f.label}</label>
                                <input
                                    type={f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text'}
                                    value={val ?? (f.type === 'number' ? (f.default ?? '') : '')}
                                    onChange={(e) => setField(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                                    placeholder={f.secret && secretSet ? '●●●●●● (set — leave blank to keep)' : f.placeholder}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                                {f.help && <p className="text-[11px] text-slate-400 mt-0.5">{f.help}</p>}
                            </div>
                        );
                    })}
                </div>
            )}

            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
            </label>

            {descriptor && !descriptor.ingestionReady && (
                <p className="text-[11px] text-slate-400">
                    Configuration is saved now; live punch ingestion for this method ships in a later release.
                </p>
            )}

            <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : initial ? 'Save' : 'Add source'}</Button>
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            </div>
        </form>
    );
};

// ── Manual entry panel ───────────────────────────────────────────────────────
interface UserOpt { id: string; email: string; profile?: { firstName?: string; lastName?: string } }
const userLabel = (u: UserOpt) => `${u.profile?.firstName ?? ''} ${u.profile?.lastName ?? ''}`.trim() || u.email;
const todayStr = () => new Date().toISOString().slice(0, 10);

const ManualEntryPanel = ({ source, onClose }: { source: AttendanceSource; onClose: () => void }) => {
    const [users, setUsers] = useState<UserOpt[]>([]);
    const [userId, setUserId] = useState('');
    const [date, setDate] = useState(todayStr());
    const [checkIn, setCheckIn] = useState('09:00');
    const [checkOut, setCheckOut] = useState('18:00');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get<UserOpt[]>('/users').then((u) => { setUsers(u); if (u[0]) setUserId(u[0].id); }).catch(() => {});
    }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) { toast('Pick an employee', 'error'); return; }
        setSaving(true);
        try {
            const r = await api.post<any>('/attendance-ingestion/manual', {
                userId, sourceId: source.id, date, checkIn, checkOut: checkOut || undefined, note: note || undefined,
            });
            toast(`Recorded — ${r?.status ?? 'saved'}${r?.hours != null ? ` (${r.hours}h)` : ''}`);
            onClose();
        } catch { /* toast shown */ } finally { setSaving(false); }
    };

    return (
        <form onSubmit={submit} className="mt-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Record attendance · {source.name}</h4>
            <div className="grid sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs text-slate-500 mb-1">Employee</label>
                    <select value={userId} onChange={(e) => setUserId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
                        {users.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-slate-500 mb-1">Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                </div>
                <div>
                    <label className="block text-xs text-slate-500 mb-1">Check-in</label>
                    <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                </div>
                <div>
                    <label className="block text-xs text-slate-500 mb-1">Check-out (optional)</label>
                    <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                </div>
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
            <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Record'}</Button>
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            </div>
        </form>
    );
};

// ── CSV import panel ─────────────────────────────────────────────────────────
const CsvImportPanel = ({ source, onClose }: { source: AttendanceSource; onClose: () => void }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any>(null);
    const [busy, setBusy] = useState(false);

    const empCol = source.configuration?.employeeIdColumn || 'employeeId';

    const doPreview = async () => {
        if (!file) { toast('Choose a CSV file', 'error'); return; }
        setBusy(true);
        try {
            const fd = new FormData(); fd.append('sourceId', source.id); fd.append('file', file);
            setPreview(await api.post<any>('/attendance-ingestion/csv/preview', fd));
        } catch { /* toast */ } finally { setBusy(false); }
    };
    const doImport = async () => {
        if (!file) return;
        setBusy(true);
        try {
            const fd = new FormData(); fd.append('sourceId', source.id); fd.append('file', file);
            const r = await api.post<any>('/attendance-ingestion/csv/import', fd);
            toast(`Imported ${r.imported} row(s), ${r.daysProjected} day(s)${r.skipped ? `, ${r.skipped} skipped` : ''}`);
            onClose();
        } catch { /* toast */ } finally { setBusy(false); }
    };

    return (
        <div className="mt-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Import CSV · {source.name}</h4>
            <p className="text-xs text-slate-500">
                Columns: <code>{empCol}</code>, <code>date</code> (YYYY-MM-DD), <code>checkIn</code> (HH:mm), <code>checkOut</code> (optional).
                Employee is matched by employee ID or email.
            </p>
            <input type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }}
                className="block text-sm text-slate-600 dark:text-slate-300" />
            {preview && (
                <div className="text-xs rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
                    <p className="text-slate-700 dark:text-slate-200">{preview.validRows} valid · {preview.errorRows} error(s) of {preview.totalRows} rows.</p>
                    {preview.errors?.length > 0 && (
                        <ul className="mt-1 text-red-500 list-disc list-inside">
                            {preview.errors.slice(0, 5).map((e: any, i: number) => <li key={i}>Row {e.row}: {e.message}</li>)}
                        </ul>
                    )}
                </div>
            )}
            <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={doPreview} disabled={busy || !file}>Preview</Button>
                <Button type="button" onClick={doImport} disabled={busy || !file || (preview && preview.validRows === 0)}>
                    {busy ? 'Working…' : 'Import'}
                </Button>
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            </div>
        </div>
    );
};

// ── Geofence manager (admin) ─────────────────────────────────────────────────
interface Geofence { id: string; name: string; centerLat: number; centerLng: number; radiusMeters: number; isActive: boolean }

const blankFence = () => ({ name: '', centerLat: '', centerLng: '', radiusMeters: '100', isActive: true });

const GeofenceManager: React.FC = () => {
    const [fences, setFences] = useState<Geofence[]>([]);
    const [editing, setEditing] = useState<Geofence | 'new' | null>(null);
    const [form, setForm] = useState<any>(blankFence());
    const [busy, setBusy] = useState(false);

    const load = () => api.get<Geofence[]>('/attendance-sources/geofences').then(setFences).catch(() => {});
    useEffect(() => { load(); }, []);

    const openEditor = (f: Geofence | 'new') => {
        setEditing(f);
        setForm(f === 'new' ? blankFence() : { name: f.name, centerLat: String(f.centerLat), centerLng: String(f.centerLng), radiusMeters: String(f.radiusMeters), isActive: f.isActive });
    };
    const set = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name: form.name.trim(), centerLat: Number(form.centerLat), centerLng: Number(form.centerLng),
            radiusMeters: Number(form.radiusMeters), isActive: form.isActive,
        };
        if (!payload.name) { toast('Name is required', 'error'); return; }
        if (!Number.isFinite(payload.centerLat) || !Number.isFinite(payload.centerLng)) { toast('Valid lat/lng required', 'error'); return; }
        setBusy(true);
        try {
            if (editing && editing !== 'new') await api.put(`/attendance-sources/geofences/${editing.id}`, payload);
            else await api.post('/attendance-sources/geofences', payload);
            toast('Geofence saved'); setEditing(null); load();
        } catch { /* toast */ } finally { setBusy(false); }
    };

    const remove = async (f: Geofence) => {
        if (!window.confirm(`Remove geofence "${f.name}"?`)) return;
        try { await api.delete(`/attendance-sources/geofences/${f.id}`); toast('Geofence removed'); setFences((a) => a.filter((x) => x.id !== f.id)); } catch { /* toast */ }
    };

    return (
        <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">Geofences</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Allowed locations for GPS attendance (used when a Mobile GPS source requires a geofence).</p>
                </div>
                {editing === null && <Button variant="secondary" onClick={() => openEditor('new')}>Add geofence</Button>}
            </div>

            {editing !== null && (
                <form onSubmit={save} className="glass-panel p-4 space-y-3">
                    <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Name (e.g. Head Office)"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                    <div className="grid grid-cols-3 gap-3">
                        <input value={form.centerLat} onChange={(e) => set('centerLat', e.target.value)} placeholder="Latitude" type="number" step="any"
                            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                        <input value={form.centerLng} onChange={(e) => set('centerLng', e.target.value)} placeholder="Longitude" type="number" step="any"
                            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                        <input value={form.radiusMeters} onChange={(e) => set('radiusMeters', e.target.value)} placeholder="Radius (m)" type="number"
                            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Active
                    </label>
                    <div className="flex gap-2">
                        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
                        <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                    </div>
                </form>
            )}

            {fences.length === 0 && editing === null && <p className="text-sm text-slate-400">No geofences yet.</p>}
            <div className="space-y-2">
                {fences.map((f) => (
                    <div key={f.id} className="glass-panel p-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                            <p className="font-medium text-slate-800 dark:text-white flex items-center gap-2">
                                📍 {f.name}
                                {!f.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">INACTIVE</span>}
                            </p>
                            <p className="text-xs text-slate-400">{f.centerLat.toFixed(5)}, {f.centerLng.toFixed(5)} · {f.radiusMeters} m</p>
                        </div>
                        <div className="flex items-center gap-3 text-sm shrink-0">
                            <button className="text-slate-500 hover:text-slate-700" onClick={() => openEditor(f)}>Edit</button>
                            <button className="text-red-500 hover:text-red-600" onClick={() => remove(f)}>Remove</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Main ─────────────────────────────────────────────────────────────────────
const AttendanceSources: React.FC = () => {
    const [types, setTypes] = useState<SourceTypeDescriptor[]>([]);
    const [sources, setSources] = useState<AttendanceSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [editor, setEditor] = useState<AttendanceSource | 'new' | null>(null);
    const [actionFor, setActionFor] = useState<{ id: string; mode: 'manual' | 'csv' } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [caps, list] = await Promise.all([
                api.get<SourceTypeDescriptor[]>('/attendance-sources/capabilities'),
                api.get<AttendanceSource[]>('/attendance-sources'),
            ]);
            setTypes(caps);
            setSources(list);
        } catch {
            /* error toast shown by api service */
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const labelFor = (type: string) => types.find((t) => t.type === type)?.label || type;

    const toggleActive = async (s: AttendanceSource) => {
        try {
            await api.put(`/attendance-sources/${s.id}`, { isActive: !s.isActive });
            setSources((arr) => arr.map((x) => x.id === s.id ? { ...x, isActive: !x.isActive } : x));
        } catch { /* toast shown */ }
    };

    const remove = async (s: AttendanceSource) => {
        if (!window.confirm(`Remove attendance source "${s.name}"?`)) return;
        try {
            await api.delete(`/attendance-sources/${s.id}`);
            toast('Attendance source removed');
            setSources((arr) => arr.filter((x) => x.id !== s.id));
        } catch { /* toast shown */ }
    };

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Attendance Sources</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Configure how this company records attendance. Multiple methods can be active at once.
                    </p>
                </div>
                {editor === null && <Button onClick={() => setEditor('new')}>Add source</Button>}
            </div>

            {editor !== null && (
                <SourceEditor
                    initial={editor === 'new' ? null : editor}
                    types={types}
                    onClose={() => setEditor(null)}
                    onSaved={() => { setEditor(null); load(); }}
                />
            )}

            {loading && <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />}

            {!loading && sources.length === 0 && editor === null && (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <div className="text-3xl mb-2" aria-hidden>🕒</div>
                    <p className="text-slate-500 mb-3">No attendance sources configured yet.</p>
                    <Button onClick={() => setEditor('new')}>Add your first source</Button>
                </div>
            )}

            <div className="space-y-2">
                {sources.map((s) => (
                    <div key={s.id} className="glass-panel p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                                <p className="font-medium text-slate-800 dark:text-white flex items-center gap-2">
                                    {s.name}
                                    {!s.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">INACTIVE</span>}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {labelFor(s.type)} · {s.ingestionMode} · priority {s.priority}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 text-sm shrink-0">
                                {s.type === 'MANUAL' && (
                                    <button className="text-primary hover:underline" onClick={() => setActionFor(actionFor?.id === s.id ? null : { id: s.id, mode: 'manual' })}>Record entry</button>
                                )}
                                {s.type === 'CSV_IMPORT' && (
                                    <button className="text-primary hover:underline" onClick={() => setActionFor(actionFor?.id === s.id ? null : { id: s.id, mode: 'csv' })}>Import CSV</button>
                                )}
                                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                                    <input type="checkbox" checked={s.isActive} onChange={() => toggleActive(s)} /> Active
                                </label>
                                <button className="text-slate-500 hover:text-slate-700" onClick={() => setEditor(s)}>Edit</button>
                                <button className="text-red-500 hover:text-red-600" onClick={() => remove(s)}>Remove</button>
                            </div>
                        </div>
                        {actionFor?.id === s.id && actionFor.mode === 'manual' && <ManualEntryPanel source={s} onClose={() => setActionFor(null)} />}
                        {actionFor?.id === s.id && actionFor.mode === 'csv' && <CsvImportPanel source={s} onClose={() => setActionFor(null)} />}
                    </div>
                ))}
            </div>

            <GeofenceManager />
        </div>
    );
};

export default AttendanceSources;
