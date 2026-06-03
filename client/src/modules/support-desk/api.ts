import { api } from '../../services/api';
import type {
    SupportDepartment, TicketCategory, TicketListRow, Ticket, TicketComment, TicketActivity, CommentVisibility,
} from './types';

// Thin typed wrappers over the shared `api` service (reuses existing auth/token).
export const supportApi = {
    listDepartments: () => api.get<SupportDepartment[]>('/support/departments'),
    listCategories: (deptId: string) => api.get<TicketCategory[]>(`/support/departments/${deptId}/categories`),

    listTickets: (params: { status?: string; supportDepartmentId?: string } = {}) => {
        const qs = new URLSearchParams();
        if (params.status) qs.set('status', params.status);
        if (params.supportDepartmentId) qs.set('supportDepartmentId', params.supportDepartmentId);
        const q = qs.toString();
        return api.get<TicketListRow[]>(`/support/tickets${q ? `?${q}` : ''}`);
    },
    getTicket: (id: string) => api.get<Ticket>(`/support/tickets/${id}`),
    listComments: (id: string) => api.get<TicketComment[]>(`/support/tickets/${id}/comments`),
    listActivity: (id: string) => api.get<TicketActivity[]>(`/support/tickets/${id}/activity`),

    createTicket: (input: { subject: string; description: string; supportDepartmentId: string; categoryId?: string; files?: File[] }) => {
        const fd = new FormData();
        fd.append('subject', input.subject);
        fd.append('description', input.description);
        fd.append('supportDepartmentId', input.supportDepartmentId);
        if (input.categoryId) fd.append('categoryId', input.categoryId);
        (input.files ?? []).forEach((f) => fd.append('files', f));
        return api.post<Ticket>('/support/tickets', fd);
    },
    addComment: (id: string, input: { body: string; visibility?: CommentVisibility; files?: File[] }) => {
        if (input.files?.length) {
            const fd = new FormData();
            fd.append('body', input.body);
            if (input.visibility) fd.append('visibility', input.visibility);
            input.files.forEach((f) => fd.append('files', f));
            return api.post<TicketComment>(`/support/tickets/${id}/comments`, fd);
        }
        return api.post<TicketComment>(`/support/tickets/${id}/comments`, { body: input.body, visibility: input.visibility });
    },
    changeStatus: (id: string, status: string, note?: string) =>
        api.post<Ticket>(`/support/tickets/${id}/status`, { status, note }),
    assign: (id: string, assigneeId: string, reason?: string) =>
        api.post<Ticket>(`/support/tickets/${id}/assign`, { assigneeId, reason }),
    assignToMe: (id: string) => api.post<Ticket>(`/support/tickets/${id}/assign-to-me`, {}),
    unassign: (id: string) => api.post<Ticket>(`/support/tickets/${id}/unassign`, {}),
    reprocessAi: (id: string) => api.post<{ message: string }>(`/support/tickets/${id}/ai-reprocess`, {}),

    // ── Admin: queue + category management ───────────────────────────────────
    listDepartmentsAdmin: () => api.get<SupportDepartment[]>('/support/departments?includeInactive=true'),
    createDepartment: (input: Partial<SupportDepartment> & { roleIds?: string[] }) =>
        api.post<SupportDepartment>('/support/departments', input),
    updateDepartment: (id: string, input: Partial<SupportDepartment> & { roleIds?: string[] }) =>
        api.put<SupportDepartment>(`/support/departments/${id}`, input),
    deleteDepartment: (id: string) => api.delete<{ message: string }>(`/support/departments/${id}`),
    restoreDepartment: (id: string) => api.post<SupportDepartment>(`/support/departments/${id}/restore`, {}),

    createCategory: (deptId: string, input: { name: string; description?: string }) =>
        api.post<TicketCategory>(`/support/departments/${deptId}/categories`, input),
    updateCategory: (id: string, input: { name?: string; description?: string; isActive?: boolean }) =>
        api.put<TicketCategory>(`/support/categories/${id}`, input),
    deleteCategory: (id: string) => api.delete<{ message: string }>(`/support/categories/${id}`),

    // HRMS endpoints reused for pickers
    listUsers: () => api.get<any[]>('/users'),
    listRoles: () => api.get<any[]>('/roles'),
};
