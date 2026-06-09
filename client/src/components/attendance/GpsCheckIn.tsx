import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { Button } from '../ui/Button';

interface CheckinOptions {
    gpsEnabled: boolean;
    sourceName: string | null;
    requireGeofence: boolean;
    requireSelfie: boolean;
    allowCheckOutWithoutSelfie: boolean;
    accuracyThresholdMeters: number | null;
}

const toast = (message: string, type: 'success' | 'error' = 'success') =>
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));

const getPosition = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) return reject(new Error('Geolocation is not available on this device'));
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });

// Downscale to ~720px on the long edge, JPEG q≈0.6 → ~30-80KB. Respects EXIF
// orientation where supported; falls back through Image/toDataURL for old browsers.
async function compressSelfie(file: File): Promise<Blob> {
    const MAX = 720;
    let width = 0, height = 0;
    let draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

    try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
        width = bitmap.width; height = bitmap.height;
        draw = (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h);
    } catch {
        const url = URL.createObjectURL(file);
        const img = await new Promise<HTMLImageElement>((res, rej) => {
            const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read the image'));
            i.src = url;
        });
        URL.revokeObjectURL(url);
        width = img.naturalWidth; height = img.naturalHeight;
        draw = (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h);
    }
    if (!width || !height) throw new Error('Invalid image');

    const scale = Math.min(1, MAX / Math.max(width, height));
    const w = Math.round(width * scale), h = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    draw(ctx, w, h);

    const blob = await new Promise<Blob | null>((res) => {
        if (canvas.toBlob) canvas.toBlob((b) => res(b), 'image/jpeg', 0.6);
        else {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            const bin = atob(dataUrl.split(',')[1]); const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            res(new Blob([arr], { type: 'image/jpeg' }));
        }
    });
    if (!blob) throw new Error('Could not process the image');
    return blob;
}

/**
 * Employee-facing GPS check-in/out with optional/required selfie. Renders only
 * when the company has an active Mobile GPS source. Native camera via
 * <input capture="user"> (no live stream). Flow: capture → compress → upload
 * (atomic, via the check-in request) → event → projection.
 */
export const GpsCheckIn: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
    const [opts, setOpts] = useState<CheckinOptions | null>(null);
    const [busy, setBusy] = useState<'CHECK_IN' | 'CHECK_OUT' | null>(null);
    const [selfie, setSelfie] = useState<{ blob: Blob; url: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        api.get<CheckinOptions>('/attendance-ingestion/checkin/options', { silent: true })
            .then(setOpts)
            .catch(() => setOpts({ gpsEnabled: false } as CheckinOptions));
        return () => { if (selfie) URL.revokeObjectURL(selfie.url); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!opts?.gpsEnabled) return null;

    const needSelfie = (eventType: 'CHECK_IN' | 'CHECK_OUT') =>
        opts.requireSelfie && (eventType === 'CHECK_IN' || !opts.allowCheckOutWithoutSelfie);

    const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-pick of same file
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast('Please capture a photo', 'error'); return; }
        if (file.size > 25 * 1024 * 1024) { toast('That photo is too large', 'error'); return; }
        try {
            const blob = await compressSelfie(file);
            if (selfie) URL.revokeObjectURL(selfie.url);
            setSelfie({ blob, url: URL.createObjectURL(blob) });
        } catch (err: any) {
            toast(err?.message || 'Could not process the photo', 'error');
        }
    };

    const punch = async (eventType: 'CHECK_IN' | 'CHECK_OUT') => {
        if (needSelfie(eventType) && !selfie) {
            toast('Please take a selfie first', 'error');
            fileRef.current?.click();
            return;
        }
        setBusy(eventType);
        try {
            const pos = await getPosition();
            const fd = new FormData();
            fd.append('eventType', eventType);
            fd.append('lat', String(pos.coords.latitude));
            fd.append('lng', String(pos.coords.longitude));
            fd.append('accuracy', String(pos.coords.accuracy));
            if (selfie) fd.append('selfie', selfie.blob, 'selfie.jpg');
            const r = await api.post<any>('/attendance-ingestion/checkin', fd);
            const where = r?.geofence ? ` at ${r.geofence}` : '';
            toast(`${eventType === 'CHECK_IN' ? 'Checked in' : 'Checked out'}${where}${r?.hours != null ? ` · ${r.hours}h` : ''}`);
            if (selfie) { URL.revokeObjectURL(selfie.url); setSelfie(null); }
            onDone?.();
        } catch (e: any) {
            toast(e?.message || 'Could not complete check-in', 'error');
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="card-premium p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <p className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">📍 GPS Attendance</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {opts.sourceName ?? 'Mobile GPS'}
                        {opts.requireGeofence && ' · must be at an allowed location'}
                        {opts.requireSelfie && ' · selfie required'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {selfie && <img src={selfie.url} alt="Selfie preview" className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />}
                    <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={!!busy}>
                        {selfie ? 'Retake selfie' : '📷 Take selfie'}
                    </Button>
                    <Button onClick={() => punch('CHECK_IN')} disabled={!!busy}>{busy === 'CHECK_IN' ? 'Locating…' : 'Check in'}</Button>
                    <Button variant="secondary" onClick={() => punch('CHECK_OUT')} disabled={!!busy}>{busy === 'CHECK_OUT' ? 'Locating…' : 'Check out'}</Button>
                </div>
            </div>
            {opts.requireSelfie && (
                <p className="text-[11px] text-slate-400">Your photo is captured as attendance evidence for verification.</p>
            )}
            {/* native camera — front-facing on mobile; no live stream */}
            <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPick} />
        </div>
    );
};

export default GpsCheckIn;
