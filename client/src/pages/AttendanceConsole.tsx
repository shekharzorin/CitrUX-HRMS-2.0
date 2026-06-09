import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, API_URL } from '../services/api';
import { Button } from '../components/ui/Button';
import AttendanceEvidenceModal from '../components/attendance/AttendanceEvidenceModal';

interface Opt { id: string; name: string }
interface FilterOptions { departments: Opt[]; branches: Opt[]; sources: Opt[] }
interface Row {
    id: string; date: string; checkIn: string | null; checkOut: string | null;
    hours: number | null; status: string; isLate: boolean; sourceName: string | null;
    employee: { id: string; name: string; employeeId: string | null; department: string | null; branch: string | null };
}
interface ListResp { rows: Row[]; total: number; page: number; pageSize: number }

const STATUSES = ['PRESENT', 'HALF_DAY', 'ABSENT', 'LATE', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND'];
const toast = (message: string, type: 'success' | 'error' = 'success') =>
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));

const fmtDate = (d?: string | null) => { try { return d ? new Date(d).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; } catch { return '—'; } };
const fmtTime = (d?: string | null) => { try { return d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'; } catch { return '—'; } };
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);

type SortBy = 'date' | 'employee' | 'hours' | 'status';

const AttendanceConsole: React.FC = () => {
    const [options, setOptions] = useState<FilterOptions>({ departments: [], branches: [], sources: [] });
    const [filters, setFilters] = useState({ search: '', from: daysAgo(30), to: today(), attendanceStatus: '', departmentId: '', branchId: '', sourceId: '' });
    const [sort, setSort] = useState<{ by: SortBy; dir: 'asc' | 'desc' }>({ by: 'date', dir: 'desc' });
    const [page, setPage] = useState(1);
    const [pageSize] = useState(25);
    const [data, setData] = useState<ListResp | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [evidence, setEvidence] = useState<{ userId: string; date: string; name?: string } | null>(null);
    const debounce = useRef<any>(null);

    useEffect(() => { api.get<FilterOptions>('/attendance/admin/filter-options', { silent: true }).then(setOptions).catch(() => {}); }, []);

    // Base query params (filters + sort) shared by list + export.
    const baseQs = useMemo(() => {
        const p = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
        p.set('sortBy', sort.by); p.set('sortDir', sort.dir);
        return p;
    }, [filters, sort]);

    const load = (pg: number) => {
        setLoading(true);
        const p = new URLSearchParams(baseQs);
        p.set('page', String(pg)); p.set('pageSize', String(pageSize));
        api.get<ListResp>(`/attendance/admin/records?${p.toString()}`, { silent: true })
            .then((r) => { setData(r); setPage(r.page); })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => load(1), 300);
        return () => clearTimeout(debounce.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseQs]);

    const set = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v }));
    const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

    const toggleSort = (by: SortBy) =>
        setSort((s) => s.by === by ? { by, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { by, dir: by === 'employee' ? 'asc' : 'desc' });
    const sortArrow = (by: SortBy) => sort.by === by ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

    const exportCsv = async () => {
        setExporting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/attendance/admin/records/export?${baseQs.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) {
                let msg = 'Export failed';
                try { msg = (await res.json()).message || msg; } catch { /* non-json */ }
                toast(msg, 'error');
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `attendance-${today()}.csv`; a.click();
            URL.revokeObjectURL(url);
            toast('Export downloaded');
        } catch { toast('Export failed', 'error'); }
        finally { setExporting(false); }
    };

    const selectCls = 'px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm';
    const sortableTh = (label: string, by: SortBy, extra = '') =>
        <th className={`px-4 py-2.5 cursor-pointer select-none hover:text-slate-600 ${extra}`} onClick={() => toggleSort(by)}>{label}{sortArrow(by)}</th>;

    const statusPill = (s: string) => <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{s}</span>;

    return (
        <div className="page-container space-y-5 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance Console</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Organization-wide attendance for HR / Admin.</p>
                </div>
                <Button variant="secondary" onClick={exportCsv} disabled={exporting}>{exporting ? 'Exporting…' : '⬇ Export CSV'}</Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-end">
                <input value={filters.search} onChange={(e) => set('search', e.target.value)} placeholder="Search name / employee ID" className={`${selectCls} flex-1 min-w-[160px]`} />
                <label className="text-xs text-slate-500 flex flex-col gap-1">From<input type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} className={selectCls} /></label>
                <label className="text-xs text-slate-500 flex flex-col gap-1">To<input type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} className={selectCls} /></label>
                <select value={filters.attendanceStatus} onChange={(e) => set('attendanceStatus', e.target.value)} className={selectCls} aria-label="Status">
                    <option value="">All statuses</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
                <select value={filters.departmentId} onChange={(e) => set('departmentId', e.target.value)} className={selectCls} aria-label="Department">
                    <option value="">All departments</option>
                    {options.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={filters.branchId} onChange={(e) => set('branchId', e.target.value)} className={selectCls} aria-label="Branch">
                    <option value="">All branches</option>
                    {options.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select value={filters.sourceId} onChange={(e) => set('sourceId', e.target.value)} className={selectCls} aria-label="Source">
                    <option value="">All sources</option>
                    {options.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wide text-slate-400 text-left">
                            <tr>
                                {sortableTh('Employee', 'employee')}
                                <th className="px-4 py-2.5 hidden md:table-cell">Department</th>
                                <th className="px-4 py-2.5 hidden lg:table-cell">Branch</th>
                                {sortableTh('Date', 'date')}
                                <th className="px-4 py-2.5 text-center hidden md:table-cell">In / Out</th>
                                {sortableTh('Hrs', 'hours', 'text-center')}
                                {sortableTh('Status', 'status', 'text-center')}
                                <th className="px-4 py-2.5 hidden lg:table-cell">Source</th>
                                <th className="px-4 py-2.5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>}
                            {!loading && data?.rows.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No attendance records match these filters.</td></tr>}
                            {!loading && data?.rows.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                    <td className="px-4 py-2.5">
                                        <div className="font-medium text-slate-800 dark:text-slate-100">{r.employee.name || '—'}</div>
                                        <div className="text-[11px] text-slate-400">{r.employee.employeeId || '—'}</div>
                                    </td>
                                    <td className="px-4 py-2.5 hidden md:table-cell text-slate-600 dark:text-slate-300">{r.employee.department || '—'}</td>
                                    <td className="px-4 py-2.5 hidden lg:table-cell text-slate-600 dark:text-slate-300">{r.employee.branch || '—'}</td>
                                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{fmtDate(r.date)}</td>
                                    <td className="px-4 py-2.5 text-center hidden md:table-cell font-mono text-xs">
                                        <span className="text-emerald-600">{fmtTime(r.checkIn)}</span> <span className="text-slate-300">/</span> <span className="text-rose-600">{fmtTime(r.checkOut)}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-semibold">{r.hours != null ? r.hours.toFixed(1) : '—'}</td>
                                    <td className="px-4 py-2.5 text-center">{statusPill(r.status)}</td>
                                    <td className="px-4 py-2.5 hidden lg:table-cell text-xs text-slate-500">{r.sourceName || '—'}</td>
                                    <td className="px-4 py-2.5 text-right">
                                        <button className="text-xs text-primary hover:underline" onClick={() => setEvidence({ userId: r.employee.id, date: r.date, name: r.employee.name })}>Evidence</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile stacked cards */}
            <div className="sm:hidden space-y-2">
                {loading && <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />}
                {!loading && data?.rows.length === 0 && <p className="text-center text-slate-400 py-8">No records match these filters.</p>}
                {!loading && data?.rows.map((r) => (
                    <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-semibold text-slate-800 dark:text-white truncate">{r.employee.name || '—'}</p>
                                <p className="text-[11px] text-slate-400">{r.employee.employeeId || '—'} · {r.employee.department || '—'}</p>
                            </div>
                            {statusPill(r.status)}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <div><span className="text-slate-400">Date:</span> {fmtDate(r.date)}</div>
                            <div><span className="text-slate-400">Hours:</span> {r.hours != null ? r.hours.toFixed(1) : '—'}</div>
                            <div><span className="text-slate-400">In/Out:</span> {fmtTime(r.checkIn)} / {fmtTime(r.checkOut)}</div>
                            <div><span className="text-slate-400">Source:</span> {r.sourceName || '—'}</div>
                        </div>
                        <button className="mt-2 text-xs text-primary hover:underline" onClick={() => setEvidence({ userId: r.employee.id, date: r.date, name: r.employee.name })}>View Evidence</button>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {data && data.total > 0 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}</span>
                    <div className="flex gap-2 items-center">
                        <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>Prev</Button>
                        <span className="px-2 py-1.5 text-slate-500">Page {data.page} / {totalPages}</span>
                        <Button variant="secondary" disabled={page >= totalPages || loading} onClick={() => load(page + 1)}>Next</Button>
                    </div>
                </div>
            )}

            {evidence && (
                <AttendanceEvidenceModal userId={evidence.userId} date={evidence.date} employeeName={evidence.name} onClose={() => setEvidence(null)} />
            )}
        </div>
    );
};

export default AttendanceConsole;
