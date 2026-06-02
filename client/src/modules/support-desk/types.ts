export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type CommentVisibility = 'PUBLIC' | 'INTERNAL' | 'ADMIN_ONLY';

export interface SupportDepartment {
    id: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    isActive?: boolean;
    isSystem?: boolean;
    visibility?: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED';
    sortOrder?: number;
    userCount?: number;
}

export interface TicketCategory {
    id: string;
    name: string;
    description?: string | null;
    supportDepartmentId?: string;
}

export interface Attachment {
    id: string;
    fileName: string;
    url: string;
    fileType: string;
    fileSize: number;
}

export interface TicketComment {
    id: string;
    body: string;
    visibility: CommentVisibility;
    authorId: string;
    author?: { id: string; profile?: { firstName?: string; lastName?: string } | null };
    attachments?: Attachment[];
    createdAt: string;
    updatedAt: string;
}

export interface TicketActivity {
    id: string;
    type: string;
    actorId?: string | null;
    data?: string | null;
    createdAt: string;
}

export interface TicketListRow {
    id: string;
    ticketNumber: number;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    createdAt: string;
    updatedAt: string;
    requesterId?: string;
    assigneeId?: string | null;
    supportDepartment?: SupportDepartment | null;
    category?: TicketCategory | null;
}

export interface Ticket extends TicketListRow {
    description: string;
    attachments: Attachment[];
    comments: TicketComment[];
    // agent-only fields
    source?: string;
    aiStatus?: string;
    slaStatus?: string;
    requester?: { id: string; email?: string; profile?: any } | null;
    assignee?: { id: string; email?: string; profile?: any } | null;
}
