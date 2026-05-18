import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';

const createAuditLog = async (action: string, entityId: string, details: string, performedBy: string) => {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                entityType: 'TASK',
                entityId,
                details,
                performedBy
            }
        });
    } catch (error) {
        console.error('[Task] Failed to create audit log', error);
    }
};

// ─── GET /tasks ─────────────────────────────────────────────────────────────
// Returns all tasks assigned to or created by the current user.
export const getMyTasks = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        const tasks = await prisma.task.findMany({
            where: {
                OR: [
                    { userId },
                    { creatorId: userId }
                ]
            },
            include: {
                creator: { select: { profile: true } },
                user: { select: { profile: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(tasks);
    } catch (error) {
        console.error('[Task] getMyTasks:', error);
        res.status(500).json({ message: 'Error fetching tasks' });
    }
};

// ─── GET /tasks/team ─────────────────────────────────────────────────────────────
export const getTeamTasks = async (req: AuthRequest, res: Response) => {
    try {
        const { userId, role, companyId } = req.user!;

        if (!['MANAGER', 'ADMIN', 'HR', 'SUPER_ADMIN'].includes(role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const tasks = await prisma.task.findMany({
            where: {
                OR: [
                    { creatorId: userId }, // Tasks I assigned
                    // Or tasks assigned to users in my company
                    { user: { companyId } }
                ]
            },
            include: {
                creator: { select: { profile: true } },
                user: { select: { profile: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(tasks);
    } catch (error) {
        console.error('[Task] getTeamTasks:', error);
        res.status(500).json({ message: 'Error fetching team tasks' });
    }
};

// ─── POST /tasks ─────────────────────────────────────────────────────────────
export const createTask = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { title, description, priority, dueDate, assignedTo } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Task title is required' });
        }

        if (!dueDate) {
            return res.status(400).json({ message: 'Due date is mandatory' });
        }

        let taskUserId = userId; // Default: personal task

        // Managers assigning to others
        if (assignedTo && assignedTo !== userId) {
            const role = req.user!.role;
            if (!['MANAGER', 'ADMIN', 'HR', 'SUPER_ADMIN'].includes(role)) {
                return res.status(403).json({ message: 'Only managers can assign tasks to others' });
            }
            taskUserId = assignedTo;
        }

        const task = await prisma.task.create({
            data: {
                userId: taskUserId,
                creatorId: userId,
                title: title.trim(),
                description: description?.trim() || null,
                priority: priority || 'MEDIUM',
                status: 'TODO',
                dueDate: new Date(dueDate),
                companyId: req.user!.companyId
            }
        });

        await createAuditLog('CREATE_TASK', task.id, `Task created by ${userId}`, userId);

        res.status(201).json(task);
    } catch (error) {
        console.error('[Task] createTask:', error);
        res.status(500).json({ message: 'Error creating task' });
    }
};

// ─── PUT /tasks/:id ──────────────────────────────────────────────────────────
export const updateTask = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;
        const { title, description, status, priority, dueDate, completionComment } = req.body;

        const existing = await prisma.task.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const isPersonal = existing.creatorId === existing.userId;
        const isAssignee = existing.userId === userId;
        const isCreator = existing.creatorId === userId;

        if (!isAssignee && !isCreator) {
            return res.status(403).json({ message: 'You are not authorized to update this task' });
        }

        const validStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        if (dueDate === null || dueDate === '') {
            return res.status(400).json({ message: 'Due date is mandatory and cannot be removed' });
        }

        // State Machine & Review Logic
        if (status) {
            if (!isPersonal) {
                // If it's a team task (creator != assignee)
                if (isAssignee && !isCreator) {
                    if (status === 'COMPLETED') {
                        return res.status(403).json({ message: 'Only managers can mark assigned tasks as COMPLETED. Please set to IN_REVIEW.' });
                    }
                }
                
                if (isCreator && !isAssignee) {
                    // Manager reopening task
                    if (status === 'TODO' && existing.status === 'IN_REVIEW') {
                        await createAuditLog('REOPEN_TASK', id, `Task reopened by manager ${userId}`, userId);
                    }
                }
            }

            // Completion comments are mandatory
            if (status === 'IN_REVIEW' || status === 'COMPLETED') {
                if (status !== existing.status) {
                    const finalComment = completionComment || existing.completionComment;
                    if (!finalComment || !finalComment.trim()) {
                        return res.status(400).json({ message: 'Completion comment is mandatory to close or submit a task for review' });
                    }
                }
            }
        }

        const updated = await prisma.task.update({
            where: { id },
            data: {
                ...(title !== undefined && { title: title.trim() }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(status !== undefined && { status }),
                ...(priority !== undefined && { priority }),
                ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
                ...(completionComment !== undefined && { completionComment: completionComment.trim() })
            }
        });

        await createAuditLog('UPDATE_TASK', id, `Task updated fields: status=${status}`, userId);

        res.json(updated);
    } catch (error) {
        console.error('[Task] updateTask:', error);
        res.status(500).json({ message: 'Error updating task' });
    }
};

// ─── DELETE /tasks/:id ───────────────────────────────────────────────────────
export const deleteTask = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        const existing = await prisma.task.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const isPersonal = existing.creatorId === existing.userId;
        const isManager = ['MANAGER', 'ADMIN', 'HR', 'SUPER_ADMIN'].includes(req.user!.role);

        if (isPersonal) {
            // Can delete personal task
            if (existing.userId !== userId) {
                return res.status(403).json({ message: 'Not authorized' });
            }
        } else {
            // Only manager/creator can delete assigned tasks
            if (!isManager || existing.creatorId !== userId) {
                return res.status(403).json({ message: 'Only the assigning manager can delete this task' });
            }
        }

        await prisma.task.delete({ where: { id } });
        await createAuditLog('DELETE_TASK', id, `Task deleted by ${userId}`, userId);

        res.json({ message: 'Task deleted' });
    } catch (error) {
        console.error('[Task] deleteTask:', error);
        res.status(500).json({ message: 'Error deleting task' });
    }
};
