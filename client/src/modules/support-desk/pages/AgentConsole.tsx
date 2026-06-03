import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/ui/Button';
import { useTicket, useTicketActivity, useAddComment, useChangeStatus, useAssignment, useReprocessAi } from '../hooks';
import { StatusBadge, PriorityBadge, AttachmentList, humanize, relativeTime } from '../ui';
import { TicketTimeline } from '../Timeline';
import { CommentComposer } from '../Composer';

const TRANSITIONS: Record<string, string[]> = {
    OPEN: ['IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED'],
    IN_PROGRESS: ['ON_HOLD', 'RESOLVED', 'CLOSED'],
    ON_HOLD: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    RESOLVED: ['CLOSED', 'REOPENED'],
    CLOSED: ['REOPENED'],
    REOPENED: ['IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED'],
};
const fullName = (a: any) => a?.profile ? `${a.profile.firstName ?? ''} ${a.profile.lastName ?? ''}`.trim() || a?.email || 'User' : (a?.email || 'User');

const AgentConsole = () => {
    const { id } = useParams<{ id: string }>();
    const { user, hasPermission } = useAuth();
    const { data: ticket, isLoading } = useTicket(id);
    const { data: activity } = useTicketActivity(id);
    const addComment = useAddComment(id!);
    const changeStatus = useChangeStatus(id!);
    const { assignToMe, unassign } = useAssignment(id!);
    const reprocess = useReprocessAi(id!);

    if (isLoading) return <div className="p-6 max-w-5xl mx-auto"><div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" /></div>;
    if (!ticket) return <div className="p-6 max-w-5xl mx-auto text-slate-500">Ticket not found.</div>;

    const canManage = hasPermission('MANAGE_TICKETS');
    const nextStatuses = TRANSITIONS[ticket.status] ?? [];
    const isMine = ticket.assignee?.id === user?.id;

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
            <Link to="/support/console" className="text-xs text-primary hover:underline">← Queue</Link>
            <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{ticket.subject}</h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        #{ticket.ticketNumber} · {ticket.supportDepartment?.name} · by {fullName(ticket.requester)} · {relativeTime(ticket.createdAt)}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-4">
                {/* Main column: description, timeline-first, conversation */}
                <div className="md:col-span-2 space-y-6">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                        <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{ticket.description}</p>
                        <AttachmentList attachments={ticket.attachments} />
                    </div>

                    <section>
                        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Activity</h2>
                        <TicketTimeline activities={activity ?? []} />
                    </section>

                    <section>
                        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Conversation</h2>
                        <div className="space-y-3">
                            {ticket.comments.map((c) => (
                                <div key={c.id} className={`p-3 rounded-lg ${c.visibility === 'PUBLIC' ? 'bg-slate-50 dark:bg-slate-800/60' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40'}`}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {fullName(c.author)} {c.visibility !== 'PUBLIC' && <span className="text-xs text-amber-600">· {humanize(c.visibility)}</span>}
                                        </span>
                                        <span className="text-xs text-slate-400">{relativeTime(c.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{c.body}</p>
                                    <AttachmentList attachments={c.attachments ?? []} />
                                </div>
                            ))}
                        </div>
                        {canManage && (
                            <div className="mt-3">
                                <CommentComposer pending={addComment.isPending} allowInternal allowAdminOnly={hasPermission('DELETE_TICKETS')}
                                    onSubmit={(input) => addComment.mutate(input)} placeholder="Reply or add an internal note…" />
                            </div>
                        )}
                    </section>
                </div>

                {/* Side column: actions */}
                <aside className="space-y-4">
                    {canManage && (
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Quick actions</h3>
                            <div className="flex flex-wrap gap-2">
                                {nextStatuses.includes('RESOLVED') && (
                                    <Button onClick={() => changeStatus.mutate({ status: 'RESOLVED' })} disabled={changeStatus.isPending}>Resolve</Button>
                                )}
                                {nextStatuses.includes('REOPENED') && (
                                    <Button variant="secondary" onClick={() => changeStatus.mutate({ status: 'REOPENED' })} disabled={changeStatus.isPending}>Reopen</Button>
                                )}
                                {!isMine && <Button variant="secondary" onClick={() => assignToMe.mutate()} disabled={assignToMe.isPending}>Assign to me</Button>}
                            </div>
                        </div>
                    )}
                    {canManage && (
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">AI</h3>
                            <p className="text-xs text-slate-500 mb-2">Routing: {ticket.aiStatus ?? 'PENDING'}</p>
                            <Button variant="secondary" onClick={() => reprocess.mutate()} disabled={reprocess.isPending}>
                                {reprocess.isPending ? 'Queuing…' : 'Reprocess AI'}
                            </Button>
                        </div>
                    )}
                    {canManage && (
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Status</h3>
                            <div className="flex flex-wrap gap-2">
                                {nextStatuses.map((s) => (
                                    <button key={s} onClick={() => changeStatus.mutate({ status: s })} disabled={changeStatus.isPending}
                                        className="text-xs px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">
                                        {humanize(s)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {canManage && (
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Assignment</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{ticket.assignee ? fullName(ticket.assignee) : 'Unassigned'}</p>
                            <div className="flex gap-2">
                                {!isMine && <Button variant="secondary" onClick={() => assignToMe.mutate()} disabled={assignToMe.isPending}>Assign to me</Button>}
                                {ticket.assignee && <Button variant="secondary" onClick={() => unassign.mutate()} disabled={unassign.isPending}>Unassign</Button>}
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default AgentConsole;
