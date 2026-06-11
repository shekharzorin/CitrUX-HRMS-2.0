/**
 * Backfill: legacy SalaryStructure (flat columns) -> Payroll Core V2
 * (component-based SalaryStructureV2 + SalaryComponentV2), and seed
 * CompanyPayrollSettings per tenant.
 *
 * IMPORTANT:
 *  - Idempotent: safe to re-run. A V2 structure is only created if one with the
 *    sentinel effectiveFrom does not already exist for that user.
 *  - ADDITIVE: never touches or deletes legacy rows; both schemas keep working.
 *  - Statutory fields (pf / esi / professionalTax) are DELIBERATELY NOT migrated
 *    into Core — they are Compliance-Pack concerns (Phase 2). Only contractual
 *    earnings/deductions move over.
 *  - Country/currency defaults record the CURRENT single-country reality as
 *    data (override via PAYROLL_DEFAULT_COUNTRY / PAYROLL_DEFAULT_CURRENCY).
 *
 * Run: node scripts/backfill-payroll-v2.cjs
 */
require('dotenv').config();
const { PrismaClient } = require('../generated/prisma');
const p = new PrismaClient();

const DEFAULT_COUNTRY = (process.env.PAYROLL_DEFAULT_COUNTRY || 'IN').toUpperCase();
const DEFAULT_CURRENCY = (process.env.PAYROLL_DEFAULT_CURRENCY || 'INR').toUpperCase();
const SENTINEL_FROM = new Date('2000-01-01T00:00:00.000Z');

const MINOR_EXCEPTIONS = { JPY: 0, KRW: 0, VND: 0, CLP: 0, ISK: 0, BHD: 3, IQD: 3, JOD: 3, KWD: 3, OMR: 3, TND: 3 };
const minorUnits = (c) => (c in MINOR_EXCEPTIONS ? MINOR_EXCEPTIONS[c] : 2);
const toMinor = (value, currency) => BigInt(Math.round(Number(value || 0) * 10 ** minorUnits(currency)));

async function seedSettings() {
    const companies = await p.company.findMany({ select: { id: true } });
    let created = 0;
    for (const c of companies) {
        const existing = await p.companyPayrollSettings.findUnique({ where: { companyId: c.id } });
        if (existing) continue;
        await p.companyPayrollSettings.create({
            data: {
                companyId: c.id,
                countryCode: DEFAULT_COUNTRY,
                currency: DEFAULT_CURRENCY,
                payFrequency: 'MONTHLY',
                weekendDays: [0, 6],
            },
        });
        created++;
    }
    console.log(`[settings] ${created} created, ${companies.length - created} already present`);
}

async function backfillStructures() {
    const legacy = await p.salaryStructure.findMany({ include: { user: { select: { companyId: true } } } });
    let created = 0;
    let skipped = 0;

    for (const ss of legacy) {
        const companyId = ss.user?.companyId;
        if (!companyId) {
            console.warn(`[skip] salary structure ${ss.id} has no company; skipping`);
            skipped++;
            continue;
        }

        const settings = await p.companyPayrollSettings.findUnique({ where: { companyId } });
        const currency = settings?.currency || DEFAULT_CURRENCY;

        const already = await p.salaryStructureV2.findFirst({
            where: { userId: ss.userId, effectiveFrom: SENTINEL_FROM },
            select: { id: true },
        });
        if (already) {
            skipped++;
            continue;
        }

        const comps = [];
        const push = (code, name, kind, val) => {
            if (val == null) return;
            comps.push({
                code,
                name,
                kind,
                calcMethod: 'FIXED',
                amountMinor: toMinor(val, currency),
                currency,
                taxable: kind === 'EARNING',
                prorate: true,
                sortOrder: comps.length,
            });
        };

        push('BASIC', 'Basic', 'EARNING', ss.basic);
        push('HRA', 'House Rent Allowance', 'EARNING', ss.hra);
        if (ss.da) push('DA', 'Dearness Allowance', 'EARNING', ss.da);
        if (ss.allowances) push('ALLOWANCE', 'Other Allowances', 'EARNING', ss.allowances);
        if (ss.deductions) push('OTHER_DEDUCTION', 'Other Deductions', 'DEDUCTION', ss.deductions);
        // NOTE: pf / esi / professionalTax are intentionally NOT migrated (statutory -> Phase 2).

        await p.salaryStructureV2.create({
            data: {
                userId: ss.userId,
                companyId,
                currency,
                ctcMinor: toMinor(ss.ctc, currency),
                effectiveFrom: SENTINEL_FROM,
                components: { create: comps },
            },
        });
        created++;
    }

    console.log(`[structures] ${created} created, ${skipped} skipped (idempotent/no-company)`);
}

(async () => {
    try {
        await seedSettings();
        await backfillStructures();
        console.log('Backfill complete.');
    } catch (e) {
        console.error('Backfill failed:', e);
        process.exitCode = 1;
    } finally {
        await p.$disconnect();
    }
})();
