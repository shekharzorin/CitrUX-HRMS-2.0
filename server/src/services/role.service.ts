import { prisma, Prisma } from '../db';
import { CacheService } from './cacheService';
import { PermissionService, Permission, Role } from './permission.service';

/**
 * RBAC v2 — per-tenant dynamic roles.
 *
 * This service owns: seeding a new tenant's default roles, and resolving the
 * effective permissions for a user (dual-read: a user's AccessRole if assigned,
 * otherwise the legacy `role` enum via PermissionService). Resolution is cached.
 *
 * NOTE: Not yet wired into the request path (`requirePermission`) or company
 * onboarding — that's a later phase. Wiring it without backfilling existing
 * users would change nothing today because no user has an accessRoleId yet.
 */

interface UserRoleContext {
    accessRoleId?: string | null;
    role: string;          // legacy enum role
    companyId?: string | null;
}

interface RoleTemplate {
    key: 'OWNER' | 'HR' | 'MANAGER' | 'EMPLOYEE';
    name: string;
    description: string;
    isOwner: boolean;
    permissions: Permission[];
}

const cacheKey = (accessRoleId: string) => `accessRole:perms:${accessRoleId}`;

export class RoleService {
    /**
     * Default roles seeded for every new tenant, derived from the legacy static
     * map so out-of-the-box behavior matches the pre-RBAC-v2 defaults.
     */
    static getDefaultRoleTemplates(): RoleTemplate[] {
        return [
            {
                key: 'OWNER',
                name: 'Admin',
                description: 'Full control of the company (protected owner role).',
                isOwner: true,
                permissions: PermissionService.getPermissionsForRole('ADMIN' as Role),
            },
            {
                key: 'HR',
                name: 'HR',
                description: 'People operations: users, leave, documents, attendance, appraisals.',
                isOwner: false,
                permissions: PermissionService.getPermissionsForRole('HR' as Role),
            },
            {
                key: 'MANAGER',
                name: 'Manager',
                description: 'Team lead: approvals, task assignment, team reports.',
                isOwner: false,
                permissions: PermissionService.getPermissionsForRole('MANAGER' as Role),
            },
            {
                key: 'EMPLOYEE',
                name: 'Employee',
                description: 'Standard employee with no elevated permissions.',
                isOwner: false,
                permissions: [],
            },
        ];
    }

    /**
     * Seed the default AccessRoles (+ their permissions) for a company.
     * Idempotent per (companyId, name) thanks to the unique constraint — callers
     * should run this once at company creation. Accepts a transaction client so
     * it can run inside the company-creation transaction.
     * Returns a map of template key -> created roleId (e.g. OWNER role id).
     */
    static async seedDefaultRoles(
        companyId: string,
        client: Prisma.TransactionClient | typeof prisma = prisma
    ): Promise<Record<string, string>> {
        const result: Record<string, string> = {};
        for (const tpl of this.getDefaultRoleTemplates()) {
            const role = await client.accessRole.create({
                data: {
                    companyId,
                    name: tpl.name,
                    description: tpl.description,
                    isSystem: true,
                    isOwner: tpl.isOwner,
                    permissions: { create: tpl.permissions.map((p) => ({ permission: p })) },
                },
            });
            result[tpl.key] = role.id;
        }
        return result;
    }

    /** Resolve an AccessRole's permission strings, cached. */
    static async getPermissionsForAccessRole(accessRoleId: string): Promise<string[]> {
        const cached = await CacheService.get<string[]>(cacheKey(accessRoleId));
        if (cached) return cached;

        const rows = await prisma.accessRolePermission.findMany({
            where: { accessRoleId },
            select: { permission: true },
        });
        const perms = rows.map((r) => r.permission);
        await CacheService.set(cacheKey(accessRoleId), perms, 10 * 60 * 1000); // 10 min
        return perms;
    }

    /** Invalidate the cached permission set after a role edit. */
    static async invalidateRoleCache(accessRoleId: string): Promise<void> {
        await CacheService.del(cacheKey(accessRoleId));
    }

    /**
     * Active users in a company whose AccessRole grants a given permission.
     * Used to target notifications at "whoever can act on this" rather than
     * hardcoded enum roles — so custom roles are included automatically.
     */
    static async getUsersWithPermission(
        companyId: string | null | undefined,
        permission: string
    ): Promise<{ id: string; email: string }[]> {
        if (!companyId) return [];
        const roles = await prisma.accessRole.findMany({
            where: { companyId, permissions: { some: { permission } } },
            select: { id: true },
        });
        if (roles.length === 0) return [];
        return prisma.user.findMany({
            where: { companyId, status: 'ACTIVE', accessRoleId: { in: roles.map((r) => r.id) } },
            select: { id: true, email: true },
        });
    }

    /**
     * Effective permissions for a user. Dual-read: prefer the assigned AccessRole,
     * fall back to the legacy enum role's static permissions.
     */
    static async getEffectivePermissions(user: UserRoleContext): Promise<string[]> {
        if (user.accessRoleId) {
            return this.getPermissionsForAccessRole(user.accessRoleId);
        }
        return PermissionService.getPermissionsForRole(user.role as Role);
    }

    /** Does the user have a given permission (dual-read)? */
    static async hasPermission(user: UserRoleContext, permission: Permission): Promise<boolean> {
        // Platform operator shortcut.
        if (user.role === 'SUPER_ADMIN') return true;
        const perms = await this.getEffectivePermissions(user);
        return perms.includes(permission);
    }
}
