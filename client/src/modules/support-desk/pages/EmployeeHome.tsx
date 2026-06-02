import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { useTickets } from '../hooks';
import { StatusBadge, PriorityBadge, relativeTime } from '../ui';
import type { TicketListRow } from '../types';

const TicketCard = ({ t }: { t: TicketListRow }) => (
    <Link
        to={`/support/tickets/${t.id}`}
        className="block p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary/60 transition"
    >
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-white truncate">{t.subject}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                    #{t.ticketNumber} · {t.supportDepartment?.name ?? 'Unassigned queue'} · {relativeTime(t.updatedAt)}
                </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
            </div>
        </div>
    </Link>
);

const EmployeeHome = () => {
    const navigate = useNavigate();
    const { data: tickets, isLoading, isError } = useTickets();

    return (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Support</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Your requests and their status.</p>
                </div>
                <Button onClick={() => navigate('/support/new')}>New ticket</Button>
            </div>

            {isLoading && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}</div>}
            {isError && <p className="text-sm text-red-600">Couldn’t load your tickets.</p>}
            {tickets && tickets.length === 0 && (
                <div className="text-center py-16 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-slate-500 mb-4">You haven’t raised any tickets yet.</p>
                    <Button onClick={() => navigate('/support/new')}>Raise your first ticket</Button>
                </div>
            )}
            {tickets && tickets.length > 0 && (
                <div className="space-y-3">{tickets.map((t) => <TicketCard key={t.id} t={t} />)}</div>
            )}
        </div>
    );
};

export default EmployeeHome;
