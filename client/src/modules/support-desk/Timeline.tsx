import type { TicketActivity } from './types';
import { humanize, relativeTime } from './ui';

const LABEL: Record<string, string> = {
    CREATED: 'Ticket created',
    STATUS_CHANGED: 'Status changed',
    REOPENED: 'Reopened',
    ASSIGNED: 'Assigned',
    UNASSIGNED: 'Unassigned',
    COMMENT_ADDED: 'Comment added',
    AI_CATEGORIZED: 'AI categorized',
    CATEGORY_CHANGED: 'Category changed',
    PRIORITY_CHANGED: 'Priority changed',
};

function detail(a: TicketActivity): string {
    if (!a.data) return '';
    try {
        const d = JSON.parse(a.data);
        if (a.type === 'STATUS_CHANGED' && d.from && d.to) return `${humanize(d.from)} → ${humanize(d.to)}`;
        if (a.type === 'AI_CATEGORIZED') return `via ${d.provider ?? 'AI'}${d.confidence != null ? ` (${Math.round(d.confidence * 100)}%)` : ''}`;
        if (a.type === 'COMMENT_ADDED' && d.visibility && d.visibility !== 'PUBLIC') return `(${humanize(d.visibility)})`;
        return '';
    } catch { return ''; }
}

export const TicketTimeline = ({ activities }: { activities: TicketActivity[] }) => {
    if (!activities?.length) return <p className="text-sm text-slate-400">No activity yet.</p>;
    return (
        <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-2">
            {activities.map((a) => (
                <li key={a.id} className="mb-4 ml-4">
                    <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
                    <div className="text-sm text-slate-700 dark:text-slate-200">
                        {LABEL[a.type] ?? humanize(a.type)}{' '}
                        <span className="text-slate-400">{detail(a)}</span>
                    </div>
                    <time className="text-xs text-slate-400">{relativeTime(a.createdAt)}</time>
                </li>
            ))}
        </ol>
    );
};
