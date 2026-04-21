import { Router } from 'express';
import { authenticateToken, authorizeRole, AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../db';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();

// Protect all routes strictly for SUPER_ADMIN
router.use(authenticateToken);
router.use(authorizeRole(['SUPER_ADMIN']));

// 1. Get all companies with stats
router.get('/', async (req: AuthRequest, res) => {
    try {
        const companies = await prisma.company.findMany({
            include: {
                _count: {
                    select: { users: true }
                },
                users: {
                    where: { role: 'SUPER_ADMIN' },
                    select: { email: true, profile: { select: { firstName: true, lastName: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = companies.map(c => ({
            id: c.id,
            name: c.name,
            domain: c.domain,
            plan: c.plan,
            createdAt: c.createdAt,
            employeeCount: c._count.users,
            superAdminEmail: c.users[0]?.email || null,
            superAdminName: c.users[0]?.profile ? `${c.users[0].profile.firstName} ${c.users[0].profile.lastName}` : null
        }));

        res.json({ value: formatted });
    } catch (error: any) {
        console.error("Error fetching companies:", error);
        res.status(500).json({ message: "Error fetching companies" });
    }
});

// 2. Create a new company
router.post('/', async (req: AuthRequest, res) => {
    try {
        const { name, domain, plan, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;

        // Validation
        if (!name || !adminEmail || !adminPassword) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Check if company exists
        const existingCompany = await prisma.company.findUnique({ where: { name } });
        if (existingCompany) {
            return res.status(400).json({ message: "Company with this name already exists" });
        }

        // Check if admin email exists
        const existingEmail = await prisma.user.findUnique({ where: { email: adminEmail } });
        if (existingEmail) {
            return res.status(400).json({ message: "Admin email already in use" });
        }

        const passwordHash = await bcrypt.hash(adminPassword, 10);

        // Transaction to create company + initial super admin user
        const newCompany = await prisma.$transaction(async (tx) => {
            const company = await tx.company.create({
                data: {
                    name,
                    domain,
                    plan: plan || 'STARTER'
                }
            });

            await tx.user.create({
                data: {
                    email: adminEmail,
                    passwordHash,
                    role: Role.SUPER_ADMIN,
                    companyId: company.id,
                    profile: {
                        create: {
                            firstName: adminFirstName || 'Admin',
                            lastName: adminLastName || '',
                            companyId: company.id
                        }
                    }
                }
            });

            return company;
        });

        res.status(201).json(newCompany);
    } catch (error: any) {
        console.error("Error creating company:", error);
        res.status(500).json({ message: "Failed to create company" });
    }
});

// 3. Update an existing company
router.put('/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { name, domain, plan, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Company name is required" });
        }

        const updatedCompany = await prisma.$transaction(async (tx) => {
            const company = await tx.company.update({
                where: { id },
                data: { name, domain, plan }
            });

            // Update associated admin if details are provided
            if (adminEmail || adminFirstName || adminLastName || adminPassword) {
                const adminUser = await tx.user.findFirst({
                    where: { companyId: id, role: 'SUPER_ADMIN' },
                    include: { profile: true }
                });

                if (adminUser) {
                    if (adminEmail && adminEmail !== adminUser.email) {
                        const existingEmail = await tx.user.findUnique({ where: { email: adminEmail } });
                        if (existingEmail) throw new Error('Email already in use');
                    }

                    const updateData: any = {};
                    if (adminEmail) updateData.email = adminEmail;
                    if (adminPassword) updateData.passwordHash = await bcrypt.hash(adminPassword, 10);

                    await tx.user.update({
                        where: { id: adminUser.id },
                        data: {
                            ...updateData,
                            profile: {
                                update: {
                                    firstName: adminFirstName || adminUser.profile?.firstName,
                                    lastName: adminLastName || adminUser.profile?.lastName
                                }
                            }
                        }
                    });
                }
            }
            return company;
        });

        res.json(updatedCompany);
    } catch (error: any) {
        console.error("Error updating company:", error);
        if (error.message === 'Email already in use') {
            return res.status(400).json({ message: "Admin email already in use" });
        }
        res.status(500).json({ message: "Failed to update company" });
    }
});

export default router;
