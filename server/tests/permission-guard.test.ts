import fs from 'fs';
import path from 'path';

// Ensures sensitive mutation routes carry an authorization guard. Source-scan
// (no DB). Regression guard for the missing-guard finding (bulk import) and the
// already-correct offboarding guards.

const route = (f: string) => fs.readFileSync(path.join(__dirname, '../src/routes', f), 'utf8');

describe('permission guards on sensitive routes', () => {
    it('bulk employee import requires MANAGE_USERS', () => {
        expect(route('import.routes.ts')).toMatch(/requirePermission\(['"]MANAGE_USERS['"]\)/);
    });

    it('offboarding admin actions require MANAGE_OFFBOARDING', () => {
        const s = route('offboarding.routes.ts');
        expect((s.match(/requirePermission\(['"]MANAGE_OFFBOARDING['"]\)/g) || []).length).toBeGreaterThanOrEqual(3);
    });

    // A curated set of admin/financial route files must contain at least one
    // permission/role guard (catches a future route mounted without protection).
    const mustGuard = [
        'payroll.routes.ts', 'payslip.routes.ts', 'leave.routes.ts', 'expense.routes.ts',
        'asset.routes.ts', 'document.routes.ts', 'shift.routes.ts', 'user.routes.ts',
        'role.routes.ts', 'import.routes.ts',
    ];
    it.each(mustGuard)('%s declares a permission/role guard', (f) => {
        const s = route(f);
        expect(/requirePermission|requireAnyPermission|authorizeRole/.test(s)).toBe(true);
    });
});
