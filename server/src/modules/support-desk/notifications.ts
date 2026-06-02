import { prisma } from '../../db';
import { notifyUser } from '../../utils/notification';
import { RoleService } from '../../shared/permissions';

/**
 * Support Desk notifications — fire-and-forget, deduped, actor-excluded.
 * Never throws to the caller (a notification failure must not break the request).
 * Only invoked from feature-gated routes, so it's inherently feature-safe.
 */
const link = (ticketId: string) => `/support/tickets/${ticketId}`;

async function send(recipients: Set<string>, actorId: string | undefined, message: string, ticketId: string) {
    if (actorId) recipients.delete(actorId); // don't notify the person who acted
    for (const userId of recipients) {
        // fire-and-forget; swallow per-recipient failures
        notifyUser(userId, message, link(ticketId), 'TASK').catch(() => {});
    }
}

export class SupportNotifier {
    private static async watchers(ticketId: string): Promise<string[]> {
        const rows = await prisma.ticketWatcher.findMany({ where: { ticketId }, select: { userId: true } });
        return rows.map((r) => r.userId);
    }

    private static async agents(companyId: string): Promise<string[]> {
        const users = await RoleService.getUsersWithPermission(companyId, 'VIEW_ALL_TICKETS');
        return users.map((u) => u.id);
    }

    /** New ticket → the queue's agents (+ assignee if pre-assigned). */
    static onCreated(ticket: { id: string; companyId: string; assigneeId: string | null; ticketNumber: number; requesterId: string }) {
        (async () => {
            const set = new Set<string>(await this.agents(ticket.companyId));
            if (ticket.assigneeId) set.add(ticket.assigneeId);
            await send(set, ticket.requesterId, `New ticket #${ticket.ticketNumber} raised`, ticket.id);
        })().catch(() => {});
    }

    /** Comment added → recipients depend on visibility tier. */
    static onComment(
        ticket: { id: string; companyId: string; requesterId: string; assigneeId: string | null; ticketNumber: number },
        visibility: 'PUBLIC' | 'INTERNAL' | 'ADMIN_ONLY',
        actorId: string,
    ) {
        (async () => {
            const set = new Set<string>();
            if (visibility === 'PUBLIC') {
                set.add(ticket.requesterId);
                if (ticket.assigneeId) set.add(ticket.assigneeId);
                (await this.watchers(ticket.id)).forEach((u) => set.add(u));
            } else if (visibility === 'INTERNAL') {
                if (ticket.assigneeId) set.add(ticket.assigneeId);
                (await this.agents(ticket.companyId)).forEach((u) => set.add(u)); // never the requester
            } else {
                const admins = await RoleService.getUsersWithPermission(ticket.companyId, 'DELETE_TICKETS');
                admins.forEach((u) => set.add(u.id));
            }
            await send(set, actorId, `New comment on ticket #${ticket.ticketNumber}`, ticket.id);
        })().catch(() => {});
    }

    /** Status change → requester + assignee. */
    static onStatusChange(
        ticket: { id: string; requesterId: string; assigneeId: string | null; ticketNumber: number },
        toStatus: string,
        actorId: string,
    ) {
        (async () => {
            const set = new Set<string>([ticket.requesterId]);
            if (ticket.assigneeId) set.add(ticket.assigneeId);
            await send(set, actorId, `Ticket #${ticket.ticketNumber} is now ${toStatus}`, ticket.id);
        })().catch(() => {});
    }

    /** Assignment → the new assignee. */
    static onAssigned(ticket: { id: string; ticketNumber: number }, assigneeId: string, actorId: string) {
        (async () => {
            await send(new Set([assigneeId]), actorId, `You were assigned ticket #${ticket.ticketNumber}`, ticket.id);
        })().catch(() => {});
    }
}
