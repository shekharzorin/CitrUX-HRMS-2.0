import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';

// ─── GET /tasks ─────────────────────────────────────────────────────────────
// Returns all tasks for the current user.
export const getMyTasks = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        const tasks = await prisma.task.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(tasks);
    } catch (error) {
        console.error('[Task] getMyTasks:', error);
        res.status(500).json({ message: 'Error fetching tasks' });
    }
};

// ─── POST /tasks ─────────────────────────────────────────────────────────────
export const createTask = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { title, description, priority, dueDate } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Task title is required' });
        }

        const task = await prisma.task.create({
            data: {
                userId,
                title: title.trim(),
                description: description?.trim() || null,
                priority: priority || 'MEDIUM',
                status: 'TODO',
                dueDate: dueDate ? new Date(dueDate) : null
            }
        });

        res.status(201).json(task);
    } catch (error) {
        console.error('[Task] createTask:', error);
        res.status(500).json({ message: 'Error creating task' });
    }
};

// ─── PUT /tasks/:id ──────────────────────────────────────────────────────────
// Update task title, description, status, or priority.
export const updateTask = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;
        const { title, description, status, priority, dueDate } = req.body;

        const existing = await prisma.task.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        const updated = await prisma.task.update({
            where: { id },
            data: {
                ...(title !== undefined && { title: title.trim() }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(status !== undefined && { status }),
                ...(priority !== undefined && { priority }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null })
            }
        });

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
        if (!existing || existing.userId !== userId) {
            return res.status(404).json({ message: 'Task not found' });
        }

        await prisma.task.delete({ where: { id } });
        res.json({ message: 'Task deleted' });
    } catch (error) {
        console.error('[Task] deleteTask:', error);
        res.status(500).json({ message: 'Error deleting task' });
    }
};
