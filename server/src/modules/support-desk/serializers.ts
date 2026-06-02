// Serializer layer — the safety net against internal-data leakage. Every ticket
// response goes through one of these whitelisting serializers; nothing is spread
// raw from the DB row.

export function serializeComment(c: any) {
    return {
        id: c.id,
        body: c.body,
        visibility: c.visibility,
        authorId: c.authorId,
        author: c.author ? { id: c.author.id, profile: c.author.profile ?? null } : undefined,
        attachments: (c.attachments ?? []).map(serializeAttachment),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}

export function serializeAttachment(a: any) {
    return { id: a.id, fileName: a.fileName, url: a.url, fileType: a.fileType, fileSize: a.fileSize };
}

function queue(t: any) {
    return t.supportDepartment ?? null;
}

/**
 * Minimal employee-facing payload. Deliberately omits assignee identity, AI/SLA
 * internals, and any non-PUBLIC comment. Callers MUST have already filtered
 * comments to PUBLIC for employees — this also hard-filters as a second guard.
 */
export function serializeTicketForEmployee(t: any) {
    return {
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        supportDepartment: queue(t),
        category: t.category ?? null,
        attachments: (t.attachments ?? []).map(serializeAttachment),
        comments: (t.comments ?? []).filter((c: any) => c.visibility === 'PUBLIC').map(serializeComment),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
    };
}

/**
 * Fuller agent payload. Comments must already be filtered to the agent's tier
 * (INTERNAL for MANAGE_TICKETS, ADMIN_ONLY for DELETE_TICKETS) before calling.
 */
export function serializeTicketForAgent(t: any) {
    return {
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        source: t.source,
        aiStatus: t.aiStatus,
        slaStatus: t.slaStatus,
        supportDepartment: queue(t),
        category: t.category ?? null,
        requester: t.requester ? { id: t.requester.id, email: t.requester.email, profile: t.requester.profile ?? null } : null,
        assignee: t.assignee ? { id: t.assignee.id, email: t.assignee.email, profile: t.assignee.profile ?? null } : null,
        attachments: (t.attachments ?? []).map(serializeAttachment),
        comments: (t.comments ?? []).map(serializeComment),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
    };
}
