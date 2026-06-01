import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { PERMISSIONS } from '../services/permission.service';
import { RoleService } from '../services/role.service';
import { assertSameCompany } from '../middlewares/tenant.middleware';
import { AuditService } from '../services/audit.service';

const PERM_SET = new Set<string>(PERMISSIONS as readonly string[]);

const unknownPermissions = (perms: string[]): string[] => perms.filter((p) => !PERM_SET.has(p));

/**
 * The caller's effective permission set, used for the privilege-escalation guard.
 * Returns null for SUPER_ADMIN to signal "unrestricted".
 */
async function callerPermissionSet(req: AuthRequest): Promise<Set<string> | null> {
    if (req.user!.role === 'SUPER_ADMIN') return null;
    const perms = await RoleService.getEffectivePermissions(req.user!);
    return new Set(perms);
}

/** GET /api/roles/catalog — the full permission catalog for the role-management UI. */
export const getPermissionCatalog = (_req: AuthRequest, res: Response) => {
    res.json({ permissions: PERMISSIONS });
};

/** GET /api/roles — the tenant's roles with their permissions and user counts. */
export const getRoles = async (req: AuthRequest, res: Response) => {
    const companyId = req.user!.companyId;
    // SUPER_ADMIN may scope to a company via ?companyId=, otherwise sees none here.
    const targetCompany = companyId || (req.query.companyId as string | undefined);
    if (!targetCompany) {
        return res.status(400).json({ message: 'Company context required' });
    }

    const roles = await prisma.accessRole.findMany({
        where: { companyId: targetCompany },
        include: {
            permissions: { select: { permission: true } },
            _count: { select: { users: true } },
        },
        orderBy: { createdAt: 'asc' },
    });

    res.json(roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        isOwner: r.isOwner,
        userCount: r._count.users,
        permissions: r.permissions.map((p) => p.permission),
    })));
};

/** POST /api/roles — create a custom role for the caller's company. */
export const createRole = async (req: AuthRequest, res: Response) => {
    const companyId = req.user!.companyId;
    if (!companyId) {
        return res.status(403).json({ message: 'Company context required to create a role' });
    }

    const { name, description, permissions = [] } = req.body as {
        name: string; description?: string; permissions?: string[];
    };

    const invalid = unknownPermissions(permissions);
    if (invalid.length) {
        return res.status(400).json({ message: `Unknown permissions: ${invalid.join(', ')}` });
    }

    // Privilege-escalation guard: you cannot grant a permission you don't hold.
    const callerPerms = await callerPermissionSet(req);
    if (callerPerms) {
        const exceeding = permissions.filter((p) => !callerPerms.has(p));
        if (exceeding.length) {
            return res.status(403).json({ message: `You cannot grant permissions you don't hold: ${exceeding.join(', ')}` });
        }
    }

    const role = await prisma.accessRole.create({
        data: {
            companyId,
            name,
            description,
            isSystem: false,
            isOwner: false,
            permissions: { create: permissions.map((p) => ({ permission: p })) },
        },
        include: { permissions: { select: { permission: true } } },
    });

    await AuditService.log(req.user!.userId, 'CREATE', 'ACCESS_ROLE', role.id, { name, permissions });
    res.status(201).json({ ...role, permissions: role.permissions.map((p) => p.permission) });
};

/** PUT /api/roles/:id — update a role's name/description/permissions. */
export const updateRole = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const role = await prisma.accessRole.findUnique({ where: { id } });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    if (!assertSameCompany(role.companyId, req, res)) return;

    if (role.isOwner) {
        return res.status(403).json({ message: 'The owner role cannot be modified (it always holds all permissions).' });
    }

    const { name, description, permissions } = req.body as {
        name?: string; description?: string; permissions?: string[];
    };

    if (permissions) {
        const invalid = unknownPermissions(permissions);
        if (invalid.length) {
            return res.status(400).json({ message: `Unknown permissions: ${invalid.join(', ')}` });
        }
        const callerPerms = await callerPermissionSet(req);
        if (callerPerms) {
            const exceeding = permissions.filter((p) => !callerPerms.has(p));
            if (exceeding.length) {
                return res.status(403).json({ message: `You cannot grant permissions you don't hold: ${exceeding.join(', ')}` });
            }
        }
        // Replace the permission set atomically.
        await prisma.$transaction([
            prisma.accessRolePermission.deleteMany({ where: { accessRoleId: id } }),
            prisma.accessRolePermission.createMany({
                data: permissions.map((p) => ({ accessRoleId: id, permission: p })),
            }),
        ]);
    }

    if (name !== undefined || description !== undefined) {
        await prisma.accessRole.update({ where: { id }, data: { name, description } });
    }

    // Invalidate cached permissions so the change takes effect immediately.
    await RoleService.invalidateRoleCache(id);
    await AuditService.log(req.user!.userId, 'UPDATE', 'ACCESS_ROLE', id, { name, permissions });

    const updated = await prisma.accessRole.findUnique({
        where: { id },
        include: { permissions: { select: { permission: true } } },
    });
    res.json({ ...updated, permissions: updated!.permissions.map((p) => p.permission) });
};

/** DELETE /api/roles/:id — delete a custom role (protected: owner/system/in-use). */
export const deleteRole = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const role = await prisma.accessRole.findUnique({ where: { id } });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    if (!assertSameCompany(role.companyId, req, res)) return;

    if (role.isOwner || role.isSystem) {
        return res.status(403).json({ message: 'System and owner roles cannot be deleted.' });
    }

    const userCount = await prisma.user.count({ where: { accessRoleId: id } });
    if (userCount > 0) {
        return res.status(409).json({ message: `Reassign the ${userCount} user(s) on this role before deleting it.` });
    }

    await prisma.accessRole.delete({ where: { id } });
    await RoleService.invalidateRoleCache(id);
    await AuditService.log(req.user!.userId, 'DELETE', 'ACCESS_ROLE', id, { name: role.name });
    res.json({ message: 'Role deleted' });
};

/** PUT /api/roles/assign/:userId — assign a user to a role. */
export const assignUserRole = async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { roleId } = req.body as { roleId: string };

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (!assertSameCompany(target.companyId, req, res)) return;

    const role = await prisma.accessRole.findUnique({ where: { id: roleId } });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    if (!assertSameCompany(role.companyId, req, res)) return;

    // Escalation guard: can't assign a role whose permissions exceed your own.
    const callerPerms = await callerPermissionSet(req);
    if (callerPerms) {
        const rolePerms = await RoleService.getPermissionsForAccessRole(roleId);
        const exceeding = rolePerms.filter((p) => !callerPerms.has(p));
        if (exceeding.length) {
            return res.status(403).json({ message: 'You cannot assign a role with permissions you don\'t hold.' });
        }
    }

    await prisma.user.update({ where: { id: userId }, data: { accessRoleId: roleId } });
    await AuditService.log(req.user!.userId, 'UPDATE', 'USER_ROLE', userId, { roleId, roleName: role.name });
    // Note: the user's existing JWT keeps its old accessRoleId until they
    // re-login or their token refreshes. Acceptable for now (P4: refresh flow).
    res.json({ message: 'Role assigned' });
};
