import fs from 'fs';
import path from 'path';

// Source-scan regression guards for the tenant-isolation fixes in this sprint.
// (No DB; these protect against the specific bypasses found in the Phase B audit.)

const ctrl = (f: string) => fs.readFileSync(path.join(__dirname, '../src/controllers', f), 'utf8');

describe('tenant isolation regressions', () => {
    it('offboarding.getResignations scopes findMany by the caller company', () => {
        const s = ctrl('offboarding.controller.ts').replace(/\s+/g, ' ');
        expect(s).toMatch(/offboarding\.findMany\(\s*\{\s*where:\s*\{\s*user:\s*getTenantScope/);
    });

    it('offboarding status-update and terminate assert same company', () => {
        const s = ctrl('offboarding.controller.ts');
        // updateOffboardingStatus + terminateEmployee both gate on assertSameCompany
        expect((s.match(/assertSameCompany/g) || []).length).toBeGreaterThanOrEqual(2);
    });

    it('import.controller creates users in the caller company only', () => {
        const s = ctrl('import.controller.ts');
        expect(s).toMatch(/const companyId = req\.user!\.companyId/);
        // companyId set on both user and profile create
        expect((s.match(/companyId/g) || []).length).toBeGreaterThanOrEqual(3);
    });

    it('no audited mutation controller is left fully unscoped (import/offboarding)', () => {
        for (const f of ['import.controller.ts', 'offboarding.controller.ts']) {
            const s = ctrl(f);
            expect(/getTenantScope|assertSameCompany|companyId/.test(s)).toBe(true);
        }
    });
});
