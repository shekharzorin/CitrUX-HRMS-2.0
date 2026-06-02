/**
 * Backfill Support Desk permissions onto existing AccessRoles (RBAC v2).
 *
 * Existing tenants' roles were seeded before the Support Desk permissions
 * existed, so they must be granted now (or admins/agents are locked out once the
 * SUPPORT_DESK feature flag is enabled).
 *
 * SAFE BY DEFAULT — runs as a DRY RUN and only logs what it *would* change.
 * Apply with:   npx ts-node -T scripts/backfill-support-permissions.ts --apply
 *
 * Idempotent: only missing permissions are added (unique constraint + skipDuplicates).
 * Custom roles are intentionally left untouched — admins grant via the Roles UI.
 * After applying, each changed role's permission cache is invalidated.
 */
import { prisma } from '../src/db';
import { RoleService } from '../src/services/role.service';

const APPLY = process.argv.includes('--apply');

// Mirror of permission.service defaults for the seeded system roles.
const OWNER_PERMS = [
    'CREATE_TICKETS', 'VIEW_TICKETS', 'VIEW_ALL_TICKETS', 'MANAGE_TICKETS',
    'MANAGE_SUPPORT_DEPARTMENTS', 'MANAGE_TICKET_CATEGORIES', 'DELETE_TICKETS',
];
const HR_PERMS = ['CREATE_TICKETS', 'VIEW_TICKETS', 'VIEW_ALL_TICKETS', 'MANAGE_TICKETS', 'MANAGE_TICKET_CATEGORIES'];
const MANAGER_PERMS = ['CREATE_TICKETS', 'VIEW_TICKETS', 'VIEW_ALL_TICKETS', 'MANAGE_TICKETS'];
const EMPLOYEE_PERMS = ['CREATE_TICKETS', 'VIEW_TICKETS'];

function targetPermsFor(role: { isOwner: boolean; name: string }): string[] {
    if (role.isOwner) return OWNER_PERMS;
    if (role.name === 'HR') return HR_PERMS;
    if (role.name === 'Manager') return MANAGER_PERMS;
    if (role.name === 'Employee') return EMPLOYEE_PERMS;
    return []; // custom roles: leave to admins
}

async function main() {
    console.log(`[SupportPermBackfill] mode = ${APPLY ? 'APPLY' : 'DRY RUN'}`);
    const roles = await prisma.accessRole.findMany({
        include: { permissions: { select: { permission: true } } },
    });
    console.log(`[SupportPermBackfill] ${roles.length} AccessRole(s) found.`);

    let rolesToChange = 0;
    let permsToAdd = 0;

    for (const role of roles) {
        const target = targetPermsFor(role);
        if (target.length === 0) continue;
        const existing = new Set(role.permissions.map((p) => p.permission));
        const missing = target.filter((p) => !existing.has(p));
        if (missing.length === 0) continue;

        rolesToChange++;
        permsToAdd += missing.length;
        console.log(`  • [${role.companyId}] role "${role.name}"${role.isOwner ? ' (owner)' : ''}: + ${missing.join(', ')}`);

        if (APPLY) {
            await prisma.accessRolePermission.createMany({
                data: missing.map((permission) => ({ accessRoleId: role.id, permission })),
                skipDuplicates: true,
            });
            await RoleService.invalidateRoleCache(role.id); // cache consistency (§)
        }
    }

    console.log(`[SupportPermBackfill] ${APPLY ? 'Applied' : 'Would add'} ${permsToAdd} permission(s) across ${rolesToChange} role(s).`);
    if (!APPLY) console.log('[SupportPermBackfill] DRY RUN only — re-run with --apply to persist.');
}

main()
    .catch((e) => { console.error('[SupportPermBackfill] FAILED:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
