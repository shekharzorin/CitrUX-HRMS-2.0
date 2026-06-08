import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Button } from '../ui/Button';

interface CheckinOptions {
    gpsEnabled: boolean;
    sourceName: string | null;
    requireGeofence: boolean;
    requireSelfie: boolean;
    accuracyThresholdMeters: number | null;
}

const toast = (message: string, type: 'success' | 'error' = 'success') =>
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));

const getPosition = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) return reject(new Error('Geolocation is not available on this device'));
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });

/**
 * Employee-facing GPS check-in/out. Renders only when the company has an active
 * Mobile GPS source. Uses the framework's event→projection pipeline.
 */
export const GpsCheckIn: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
    const [opts, setOpts] = useState<CheckinOptions | null>(null);
    const [busy, setBusy] = useState<'CHECK_IN' | 'CHECK_OUT' | null>(null);

    useEffect(() => {
        api.get<CheckinOptions>('/attendance-ingestion/checkin/options', { silent: true })
            .then(setOpts)
            .catch(() => setOpts({ gpsEnabled: false } as CheckinOptions));
    }, []);

    if (!opts?.gpsEnabled) return null;

    const punch = async (eventType: 'CHECK_IN' | 'CHECK_OUT') => {
        setBusy(eventType);
        try {
            const pos = await getPosition();
            const r = await api.post<any>('/attendance-ingestion/checkin', {
                eventType,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
            });
            const where = r?.geofence ? ` at ${r.geofence}` : '';
            toast(`${eventType === 'CHECK_IN' ? 'Checked in' : 'Checked out'}${where}${r?.hours != null ? ` · ${r.hours}h` : ''}`);
            onDone?.();
        } catch (e: any) {
            toast(e?.message || 'Could not get your location', 'error');
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="card-premium p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
                <p className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">📍 GPS Attendance</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {opts.sourceName ?? 'Mobile GPS'}
                    {opts.requireGeofence && ' · must be at an allowed location'}
                    {opts.requireSelfie && ' · selfie required'}
                </p>
            </div>
            <div className="flex gap-2">
                <Button onClick={() => punch('CHECK_IN')} disabled={!!busy}>{busy === 'CHECK_IN' ? 'Locating…' : 'Check in'}</Button>
                <Button variant="secondary" onClick={() => punch('CHECK_OUT')} disabled={!!busy}>{busy === 'CHECK_OUT' ? 'Locating…' : 'Check out'}</Button>
            </div>
        </div>
    );
};

export default GpsCheckIn;
