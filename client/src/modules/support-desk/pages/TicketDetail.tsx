import { useParams, Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { useTicket, useTicketActivity, useAddComment, useChangeStatus } from '../hooks';
import { StatusBadge, PriorityBadge, AttachmentList, relativeTime } from '../ui';
import { TicketTimeline } from '../Timeline';
import { CommentComposer } from '../Composer';

const fullName = (a: any) => a?.profile ? `${a.profile.firstName ?? ''} ${a.profile.lastName ?? ''}`.trim() || 'User' : 'User';

const TicketDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { data: ticket, isLoading } = useTicket(id);
    const { data: activity } = useTicketActivity(id);
    const addComment = useAddComment(id!);
    const changeStatus = useChangeStatus(id!);

    if (isLoading) return <div className="p-6 max-w-3xl mx-auto"><div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" /></div>;
    if (!ticket) return <div className="p-6 max-w-3xl mx-auto text-slate-500">Ticket not found.</div>;

    const canReopen = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';

    return (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
            <Link to="/support" className="text-xs text-primary hover:underline">← My tickets</Link>
            <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{ticket.subject}</h1>
                    <p className="text-xs text-slate-400 mt-0.5">#{ticket.ticketNumber} · {ticket.supportDepartment?.name} · {relativeTime(ticket.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                </div>
            </div>

            <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{ticket.description}</p>
                <AttachmentList attachments={ticket.attachments} />
            </div>

            {canReopen && (
                <div className="mt-3">
                    <Button variant="secondary" onClick={() => changeStatus.mutate({ status: 'REOPENED' })} disabled={changeStatus.isPending}>
                        Reopen ticket
                    </Button>
                </div>
            )}

            <div className="mt-6 grid gap-6">
                <section>
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Conversation</h2>
                    <div className="space-y-3">
                        {ticket.comments.length === 0 && <p className="text-sm text-slate-400">No replies yet.</p>}
                        {ticket.comments.map((c) => (
                            <div key={c.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{fullName(c.author)}</span>
                                    <span className="text-xs text-slate-400">{relativeTime(c.createdAt)}</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{c.body}</p>
                                <AttachmentList attachments={c.attachments ?? []} />
                            </div>
                        ))}
                    </div>
                    <div className="mt-3">
                        <CommentComposer pending={addComment.isPending} onSubmit={(input) => addComment.mutate(input)} placeholder="Add a reply…" />
                    </div>
                </section>

                <section>
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Activity</h2>
                    <TicketTimeline activities={activity ?? []} />
                </section>
            </div>
        </div>
    );
};

export default TicketDetail;
