import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Button } from '../ui/Button';

interface EvidenceEvent {
    id: string;
    eventType: string;
    timestamp: string;
    verificationMethod: string | null;
    sourceName: string | null;
    sourceType: string | null;
    selfieUrl: string | null;
    selfieStatus: string | null;
    location: { lat?: number; lng?: number; accuracy?: number; geofenceId?: string | null } | null;
}

const fmt = (iso: string) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };

/**
 * Attendance evidence viewer (Phase A). Launched from an attendance record.
 * Shows each event's selfie, GPS, source, timestamp, verification method.
 * Backend enforces access: own events always; another employee requires
 * MANAGE_ATTENDANCE.
 */
export const AttendanceEvidenceModal: React.FC<{
    userId: string; date: string; employeeName?: string; onClose: () => void;
}> = ({ userId, date, employeeName, onClose }) => {
    const [events, setEvents] = useState<EvidenceEvent[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const day = (date || '').slice(0, 10);

    useEffect(() => {
        const qs = `userId=${encodeURIComponent(userId)}&from=${day}&to=${day}`;
        api.get<EvidenceEvent[]>(`/attendance-ingestion/events?${qs}`, { silent: true })
            .then(setEvents)
            .catch((e) => setError(e?.message || 'Could not load evidence'));
    }, [userId, day]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Attendance Evidence</h3>
                        <p className="text-xs text-slate-500">{employeeName ? `${employeeName} · ` : ''}{day}</p>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 text-xl leading-none" onClick={onClose} aria-label="Close">×</button>
                </div>

                <div className="p-5 space-y-4">
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {!events && !error && <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />}
                    {events && events.length === 0 && <p className="text-sm text-slate-500">No attendance events recorded for this day.</p>}

                    {events?.map((ev) => {
                        const lat = ev.location?.lat; const lng = ev.location?.lng;
                        const hasGps = typeof lat === 'number' && typeof lng === 'number';
                        return (
                            <div key={ev.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex gap-4">
                                {ev.selfieUrl ? (
                                    <a href={ev.selfieUrl} target="_blank" rel="noreferrer" className="shrink-0">
                                        <img src={ev.selfieUrl} alt={`${ev.eventType} selfie`} className="w-24 h-24 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                                    </a>
                                ) : (
                                    <div className="w-24 h-24 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs text-center shrink-0">No selfie</div>
                                )}
                                <div className="min-w-0 flex-1 text-sm">
                                    <p className="font-semibold text-slate-800 dark:text-white">
                                        {ev.eventType === 'CHECK_IN' ? 'Check in' : ev.eventType === 'CHECK_OUT' ? 'Check out' : ev.eventType}
                                        {ev.selfieStatus && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{ev.selfieStatus}</span>}
                                    </p>
                                    <dl className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                                        <div><span className="text-slate-400">Time:</span> {fmt(ev.timestamp)}</div>
                                        <div><span className="text-slate-400">Source:</span> {ev.sourceName ?? '—'}</div>
                                        <div><span className="text-slate-400">Method:</span> {ev.verificationMethod ?? '—'}</div>
                                        {hasGps && (
                                            <div>
                                                <span className="text-slate-400">GPS:</span> {lat!.toFixed(5)}, {lng!.toFixed(5)}
                                                {typeof ev.location?.accuracy === 'number' && <span className="text-slate-400"> (±{Math.round(ev.location.accuracy)}m)</span>}
                                            </div>
                                        )}
                                    </dl>
                                    {hasGps && (
                                        <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer"
                                            className="inline-block mt-2 text-xs text-primary hover:underline">Open in Maps ↗</a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceEvidenceModal;
