import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { Attachment, TicketPriority, TicketStatus } from './types';

export const humanize = (s: string) =>
    s.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export const relativeTime = (iso: string) => {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString();
};

const STATUS_CLASS: Record<TicketStatus, string> = {
    OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    ON_HOLD: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    CLOSED: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    REOPENED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};
const PRIORITY_CLASS: Record<TicketPriority, string> = {
    LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    MEDIUM: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export const StatusBadge = ({ status }: { status: TicketStatus }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[status] ?? ''}`}>
        {humanize(status)}
    </span>
);

export const PriorityBadge = ({ priority }: { priority: TicketPriority }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CLASS[priority] ?? ''}`}>
        {humanize(priority)}
    </span>
);

export const AttachmentList = ({ attachments }: { attachments: Attachment[] }) => {
    if (!attachments?.length) return null;
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {attachments.map((a) => (
                <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 max-w-[200px]"
                    title={a.fileName}
                >
                    {a.fileType?.startsWith('image/')
                        ? <img src={a.url} alt={a.fileName} className="w-8 h-8 rounded object-cover" />
                        : <span aria-hidden>📎</span>}
                    <span className="truncate">{a.fileName}</span>
                </a>
            ))}
        </div>
    );
};

// ── Density (comfortable | compact), localStorage-backed, globally synced ────
export type Density = 'comfortable' | 'compact';
const DENSITY_EVENT = 'support:density';

export function useDensity(): [Density, () => void] {
    const [density, setDensity] = useState<Density>(
        () => (localStorage.getItem('support:density') as Density) || 'comfortable',
    );
    useEffect(() => {
        const handler = () => setDensity((localStorage.getItem('support:density') as Density) || 'comfortable');
        window.addEventListener(DENSITY_EVENT, handler);
        return () => window.removeEventListener(DENSITY_EVENT, handler);
    }, []);
    const toggle = () => {
        const next: Density = density === 'comfortable' ? 'compact' : 'comfortable';
        localStorage.setItem('support:density', next);
        window.dispatchEvent(new Event(DENSITY_EVENT));
    };
    return [density, toggle];
}

export const DensityToggle = () => {
    const [density, toggle] = useDensity();
    return (
        <button
            onClick={toggle}
            className="text-xs px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Toggle row density"
        >
            {density === 'comfortable' ? 'Comfortable' : 'Compact'}
        </button>
    );
};

// ── Feature guard — renders children only if the feature flag is on ──────────
export const RequireSupportFeature = ({ children }: { children: React.ReactElement }) => {
    const { hasFeature } = useAuth();
    if (!hasFeature('SUPPORT_DESK')) return <Navigate to="/" replace />;
    return children;
};

// Client-side permission gate (UX only — the backend remains the authority).
export const RequirePermission = ({ permission, children }: { permission: string; children: React.ReactElement }) => {
    const { hasPermission } = useAuth();
    if (!hasPermission(permission)) return <Navigate to="/support" replace />;
    return children;
};
