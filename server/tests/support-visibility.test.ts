import { serializeTicketForEmployee, serializeTicketForAgent } from '../src/modules/support-desk/serializers';

// Support Desk visibility rules: employees must never receive INTERNAL/ADMIN_ONLY
// comments or agent-only internals (assignee identity, AI/SLA, requester email).

const baseTicket = () => ({
    id: 't1', ticketNumber: 7, subject: 's', description: 'd', status: 'OPEN', priority: 'MEDIUM',
    supportDepartment: { id: 'q1', name: 'General' }, category: null, attachments: [],
    createdAt: new Date(), updatedAt: new Date(),
    // agent-only internals that must NOT leak to employees:
    source: 'WEB', aiStatus: 'COMPLETED', slaStatus: 'OK',
    requester: { id: 'u1', email: 'requester@x.com', profile: {} },
    assignee: { id: 'a1', email: 'agent@x.com', profile: {} },
    comments: [
        { id: 'c1', body: 'public reply', visibility: 'PUBLIC', authorId: 'a1' },
        { id: 'c2', body: 'internal note', visibility: 'INTERNAL', authorId: 'a1' },
        { id: 'c3', body: 'admin only', visibility: 'ADMIN_ONLY', authorId: 'a1' },
    ],
});

describe('Support Desk visibility rules', () => {
    it('employee payload drops non-PUBLIC comments', () => {
        const out = serializeTicketForEmployee(baseTicket());
        expect(out.comments).toHaveLength(1);
        expect(out.comments[0].visibility).toBe('PUBLIC');
        const bodies = out.comments.map((c: any) => c.body);
        expect(bodies).not.toContain('internal note');
        expect(bodies).not.toContain('admin only');
    });

    it('employee payload omits agent-only internals', () => {
        const out: any = serializeTicketForEmployee(baseTicket());
        for (const k of ['source', 'aiStatus', 'slaStatus', 'requester', 'assignee']) {
            expect(out[k]).toBeUndefined();
        }
    });

    it('agent payload retains internals + all comments (filtering happens upstream)', () => {
        const out: any = serializeTicketForAgent(baseTicket());
        expect(out.aiStatus).toBe('COMPLETED');
        expect(out.assignee).not.toBeNull();
        expect(out.comments).toHaveLength(3);
    });
});
