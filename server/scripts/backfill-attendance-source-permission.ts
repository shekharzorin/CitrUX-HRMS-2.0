/**
 * Backfill the MANAGE_ATTENDANCE_SOURCES permission onto existing owner/admin
 * AccessRoles (RBAC v2).
 *
 * "Admin owns all attendance settings" — only the tenant owner/admin role gets
 * this capability. HR/Manager/Employee are intentionally NOT granted it.
 * Custom roles are left for admins to grant via the Roles UI.
 *
 * SAFE BY DEFAULT — dry run unless --apply is passed:
 *   npx ts-node -T scripts/backfill-attendance-source-permission.ts --apply
 *
 * Idempotent (skipDuplicates). Invalidates each changed role's permission cache.
 */
import { prisma } from '../src/db';
import { RoleService } from '../src/services/role.service';

const APPLY = process.argv.includes('--apply');
const PERM = 'MANAGE_ATTENDANCE_SOURCES';

async function main() {
    console.log(`[AttnSrcPermBackfill] mode = ${APPLY ? 'APPLY' : 'DRY RUN'}`);
    const roles = await prisma.accessRole.findMany({
        include: { permissions: { select: { permission: true } } },
    });
    console.log(`[AttnSrcPermBackfill] ${roles.length} AccessRole(s) found.`);

    let rolesToChange = 0;
    for (const role of roles) {
        if (!role.isOwner) continue; // admin-only capability
        const has = role.permissions.some((p) => p.permission === PERM);
        if (has) continue;

        rolesToChange++;
        console.log(`  • [${role.companyId}] role "${role.name}" (owner): + ${PERM}`);
        if (APPLY) {
            await prisma.accessRolePermission.createMany({
                data: [{ accessRoleId: role.id, permission: PERM }],
                skipDuplicates: true,
            });
            await RoleService.invalidateRoleCache(role.id);
        }
    }

    console.log(`[AttnSrcPermBackfill] ${APPLY ? 'Applied to' : 'Would change'} ${rolesToChange} owner role(s).`);
    if (!APPLY) console.log('[AttnSrcPermBackfill] DRY RUN only — re-run with --apply to persist.');
}

main()
    .catch((e) => { console.error('[AttnSrcPermBackfill] FAILED:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
