import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from './api';
import type { CommentVisibility } from './types';

const keys = {
    departments: ['support', 'departments'] as const,
    categories: (deptId: string) => ['support', 'categories', deptId] as const,
    tickets: (filters: object) => ['support', 'tickets', filters] as const,
    ticket: (id: string) => ['support', 'ticket', id] as const,
    comments: (id: string) => ['support', 'comments', id] as const,
    activity: (id: string) => ['support', 'activity', id] as const,
};

// Queues/categories rarely change → cache longer.
export const useDepartments = () =>
    useQuery({ queryKey: keys.departments, queryFn: supportApi.listDepartments, staleTime: 5 * 60_000 });

export const useCategories = (deptId?: string) =>
    useQuery({ queryKey: keys.categories(deptId ?? ''), queryFn: () => supportApi.listCategories(deptId!), enabled: !!deptId, staleTime: 5 * 60_000 });

export const useTickets = (filters: { status?: string; supportDepartmentId?: string } = {}) =>
    useQuery({ queryKey: keys.tickets(filters), queryFn: () => supportApi.listTickets(filters) });

export const useTicket = (id?: string) =>
    useQuery({ queryKey: keys.ticket(id ?? ''), queryFn: () => supportApi.getTicket(id!), enabled: !!id });

export const useTicketActivity = (id?: string) =>
    useQuery({ queryKey: keys.activity(id ?? ''), queryFn: () => supportApi.listActivity(id!), enabled: !!id });

// ── Mutations (invalidate the relevant caches on success) ────────────────────
export const useCreateTicket = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: supportApi.createTicket,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['support', 'tickets'] }); },
    });
};

export const useAddComment = (ticketId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { body: string; visibility?: CommentVisibility; files?: File[] }) => supportApi.addComment(ticketId, input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: keys.comments(ticketId) });
            qc.invalidateQueries({ queryKey: keys.ticket(ticketId) });
            qc.invalidateQueries({ queryKey: keys.activity(ticketId) });
        },
    });
};

export const useChangeStatus = (ticketId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { status: string; note?: string }) => supportApi.changeStatus(ticketId, input.status, input.note),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: keys.ticket(ticketId) });
            qc.invalidateQueries({ queryKey: keys.activity(ticketId) });
            qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
        },
    });
};

export const useReprocessAi = (ticketId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => supportApi.reprocessAi(ticketId),
        onSuccess: () => { qc.invalidateQueries({ queryKey: keys.ticket(ticketId) }); },
    });
};

// ── Admin: queues, categories, pickers ───────────────────────────────────────
export const useDepartmentsAdmin = () =>
    useQuery({ queryKey: ['support', 'departments', 'admin'], queryFn: supportApi.listDepartmentsAdmin });

export const useUsers = () =>
    useQuery({ queryKey: ['support', 'users'], queryFn: supportApi.listUsers, staleTime: 5 * 60_000 });

export const useRoles = () =>
    useQuery({ queryKey: ['support', 'roles'], queryFn: supportApi.listRoles, staleTime: 5 * 60_000 });

export const useQueueMutations = () => {
    const qc = useQueryClient();
    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['support', 'departments'] });
    };
    return {
        create: useMutation({ mutationFn: supportApi.createDepartment, onSuccess: invalidate }),
        update: useMutation({ mutationFn: (v: { id: string; input: any }) => supportApi.updateDepartment(v.id, v.input), onSuccess: invalidate }),
        remove: useMutation({ mutationFn: (id: string) => supportApi.deleteDepartment(id), onSuccess: invalidate }),
        restore: useMutation({ mutationFn: (id: string) => supportApi.restoreDepartment(id), onSuccess: invalidate }),
    };
};

export const useCategoryMutations = (deptId: string) => {
    const qc = useQueryClient();
    const invalidate = () => { qc.invalidateQueries({ queryKey: keys.categories(deptId) }); };
    return {
        create: useMutation({ mutationFn: (input: { name: string; description?: string }) => supportApi.createCategory(deptId, input), onSuccess: invalidate }),
        update: useMutation({ mutationFn: (v: { id: string; input: any }) => supportApi.updateCategory(v.id, v.input), onSuccess: invalidate }),
        remove: useMutation({ mutationFn: (id: string) => supportApi.deleteCategory(id), onSuccess: invalidate }),
    };
};

export const useAssignment = (ticketId: string) => {
    const qc = useQueryClient();
    const invalidate = () => {
        qc.invalidateQueries({ queryKey: keys.ticket(ticketId) });
        qc.invalidateQueries({ queryKey: keys.activity(ticketId) });
        qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    };
    return {
        assignToMe: useMutation({ mutationFn: () => supportApi.assignToMe(ticketId), onSuccess: invalidate }),
        unassign: useMutation({ mutationFn: () => supportApi.unassign(ticketId), onSuccess: invalidate }),
        assign: useMutation({ mutationFn: (assigneeId: string) => supportApi.assign(ticketId, assigneeId), onSuccess: invalidate }),
    };
};
