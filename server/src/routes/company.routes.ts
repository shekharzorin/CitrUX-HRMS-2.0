import { Router } from 'express';
import { authenticateToken, authorizeRole, AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../db';
import { Role } from '../../generated/prisma';
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
                    where: { role: 'ADMIN' },
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
            slogan: c.slogan,
            createdAt: c.createdAt,
            employeeCount: c._count.users,
            status: c.status,
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
        const { name, domain, plan, slogan, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;

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
                    plan: plan || 'STARTER',
                    slogan: slogan || 'Citrux SaaS'
                }
            });

            await tx.user.create({
                data: {
                    email: adminEmail,
                    passwordHash,
                    role: Role.ADMIN,
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
        const { name, domain, plan, slogan, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Company name is required" });
        }

        const updatedCompany = await prisma.$transaction(async (tx) => {
            const company = await tx.company.update({
                where: { id },
                data: { name, domain, plan, slogan }
            });

            // Update associated admin if details are provided
            if (adminEmail || adminFirstName || adminLastName || adminPassword) {
                const adminUser = await tx.user.findFirst({
                    where: { companyId: id, role: 'ADMIN' },
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

// 4. Archive (Soft Delete) a company
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        const existingCompany = await prisma.company.findUnique({ where: { id } });
        if (!existingCompany) {
            return res.status(404).json({ message: "Company not found" });
        }

        const archivedCompany = await prisma.company.update({
            where: { id },
            data: { status: 'ARCHIVED' }
        });

        res.json({ message: "Company archived successfully", company: archivedCompany });
    } catch (error: any) {
        console.error("Error archiving company:", error);
        res.status(500).json({ message: "Failed to archive company" });
    }
});

// 5. Restore (Unarchive) a company
router.put('/:id/restore', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        const existingCompany = await prisma.company.findUnique({ where: { id } });
        if (!existingCompany) {
            return res.status(404).json({ message: "Company not found" });
        }

        const restoredCompany = await prisma.company.update({
            where: { id },
            data: { status: 'ACTIVE' }
        });

        res.json({ message: "Company restored successfully", company: restoredCompany });
    } catch (error: any) {
        console.error("Error restoring company:", error);
        res.status(500).json({ message: "Failed to restore company" });
    }
});

// 6. Hard Delete a company
router.delete('/:id/hard', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        const existingCompany = await prisma.company.findUnique({ where: { id } });
        if (!existingCompany) {
            return res.status(404).json({ message: "Company not found" });
        }

        // Because we added onDelete: Cascade to the schema, this will delete the company and all associated records.
        await prisma.company.delete({
            where: { id }
        });

        res.json({ message: "Company permanently deleted" });
    } catch (error: any) {
        console.error("Error permanently deleting company:", error);
        res.status(500).json({ message: "Failed to permanently delete company" });
    }
});

export default router;
