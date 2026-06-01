/**
 * One-off backfill for RBAC v2.
 *
 * For every company: ensure the default AccessRoles exist, then assign each user
 * (whose accessRoleId is still null) to the role matching their legacy enum role.
 * SUPER_ADMIN users are platform-level and left unassigned.
 *
 * Idempotent: safe to re-run. Run with:
 *   npx ts-node -T scripts/backfill-access-roles.ts
 */
import { prisma } from '../src/db';
import { RoleService } from '../src/services/role.service';

const ENUM_TO_TEMPLATE: Record<string, 'OWNER' | 'HR' | 'MANAGER' | 'EMPLOYEE'> = {
    ADMIN: 'OWNER',
    HR: 'HR',
    MANAGER: 'MANAGER',
    EMPLOYEE: 'EMPLOYEE',
};

async function roleIdsForCompany(companyId: string): Promise<Record<string, string>> {
    const existing = await prisma.accessRole.findMany({ where: { companyId } });
    if (existing.length === 0) {
        return RoleService.seedDefaultRoles(companyId);
    }
    // Build the key map from already-seeded roles.
    const map: Record<string, string> = {};
    for (const r of existing) {
        if (r.isOwner) map.OWNER = r.id;
        else if (r.name === 'HR') map.HR = r.id;
        else if (r.name === 'Manager') map.MANAGER = r.id;
        else if (r.name === 'Employee') map.EMPLOYEE = r.id;
    }
    return map;
}

async function main() {
    const companies = await prisma.company.findMany({ select: { id: true, name: true } });
    console.log(`[Backfill] ${companies.length} company(ies) found.`);

    let assigned = 0;
    for (const company of companies) {
        const roleIds = await roleIdsForCompany(company.id);

        const users = await prisma.user.findMany({
            where: { companyId: company.id, accessRoleId: null },
            select: { id: true, role: true },
        });

        for (const u of users) {
            if (u.role === 'SUPER_ADMIN') continue; // platform-level, no tenant role
            const key = ENUM_TO_TEMPLATE[u.role] || 'EMPLOYEE';
            const roleId = roleIds[key];
            if (!roleId) continue;
            await prisma.user.update({ where: { id: u.id }, data: { accessRoleId: roleId } });
            assigned++;
        }
        console.log(`[Backfill] ${company.name}: ${users.length} user(s) processed.`);
    }

    console.log(`[Backfill] Done. Assigned ${assigned} user(s) to AccessRoles.`);
}

main()
    .catch((e) => { console.error('[Backfill] FAILED:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
