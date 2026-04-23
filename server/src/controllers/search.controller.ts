import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope } from '../middlewares/tenant.middleware';

export const globalSearch = async (req: AuthRequest, res: Response) => {
    try {
        const query = req.query.q as string;
        if (!query || query.length < 2) {
            return res.json([]);
        }

        const tenantWhere = getTenantScope(req);
        const limit = 10;

        // 1. Search Users
        const users = await prisma.user.findMany({
            where: {
                ...tenantWhere,
                OR: [
                    { email: { contains: query, mode: 'insensitive' } },
                    { employeeId: { contains: query, mode: 'insensitive' } },
                    {
                        profile: {
                            OR: [
                                { firstName: { contains: query, mode: 'insensitive' } },
                                { lastName: { contains: query, mode: 'insensitive' } },
                                { designation: { contains: query, mode: 'insensitive' } }
                            ]
                        }
                    }
                ]
            },
            include: { profile: true },
            take: limit
        });

        // 2. Search Tasks
        const tasks = await prisma.task.findMany({
            where: {
                ...tenantWhere,
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: limit
        });

        // Format results
        const results: any[] = [
            ...users.map(u => ({
                id: u.id,
                type: 'employee',
                title: `${u.profile?.firstName} ${u.profile?.lastName}`.trim() || u.email,
                subtitle: u.profile?.designation || 'Employee',
                link: `/employees/${u.id}`,
                icon: 'employees'
            })),
            ...tasks.map(t => ({
                id: t.id,
                type: 'task',
                title: t.title,
                subtitle: `Priority: ${t.priority}`,
                link: `/tasks`,
                icon: 'approvals'
            }))
        ];

        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
