/**
 * CompanyPayrollSettings service (Phase 1).
 *
 * One settings row per tenant for now. The only field that changes when
 * multiple legal entities per tenant arrive is the scoping key (companyId ->
 * legalEntityId); no payroll math reads tenant columns directly, so that stays
 * a localized change.
 *
 * Also builds the WorkingDayCalendar from the tenant's weekend config + the
 * existing company-scoped Holiday table (no hardcoded Sat/Sun).
 */
import { prisma } from '../../db';
import { AuditService } from '../../services/audit.service';
import { WorkingDayCalendar } from '../calendar/working-day-calendar';
import { assertValidCurrency } from '../money/currency';

export interface CompanySettingsInput {
    countryCode: string;
    currency: string;
    payFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'SEMI_MONTHLY';
    timezone?: string;
    fiscalYearStartMonth?: number;
    fiscalYearStartDay?: number;
    weekendDays?: number[];
    compliancePackId?: string | null;
    compliancePackVersion?: string | null;
}

export class CompanyPayrollSettingsService {
    static async get(companyId: string) {
        return prisma.companyPayrollSettings.findUnique({ where: { companyId } });
    }

    static async getOrThrow(companyId: string) {
        const settings = await CompanyPayrollSettingsService.get(companyId);
        if (!settings) {
            throw new Error(`CompanyPayrollSettings not configured for company ${companyId}`);
        }
        return settings;
    }

    static async upsert(companyId: string, input: CompanySettingsInput, actorId: string) {
        assertValidCurrency(input.currency.toUpperCase());
        const data = {
            countryCode: input.countryCode.toUpperCase(),
            currency: input.currency.toUpperCase(),
            payFrequency: input.payFrequency ?? 'MONTHLY',
            timezone: input.timezone ?? 'UTC',
            fiscalYearStartMonth: input.fiscalYearStartMonth ?? 1,
            fiscalYearStartDay: input.fiscalYearStartDay ?? 1,
            weekendDays: input.weekendDays ?? [0, 6],
            compliancePackId: input.compliancePackId ?? null,
            compliancePackVersion: input.compliancePackVersion ?? null,
        };
        const settings = await prisma.companyPayrollSettings.upsert({
            where: { companyId },
            create: { companyId, ...data },
            update: data,
        });
        await AuditService.log(actorId, 'UPSERT', 'PAYROLL_SETTINGS', settings.id, { companyId });
        return settings;
    }

    /** Build a WorkingDayCalendar for a tenant over a period (weekends + holidays). */
    static async buildCalendar(companyId: string, period: { start: Date; end: Date }) {
        const settings = await CompanyPayrollSettingsService.getOrThrow(companyId);
        const holidays = await prisma.holiday.findMany({
            where: {
                date: { gte: period.start, lte: period.end },
                OR: [{ companyId }, { companyId: null }],
            },
            select: { date: true },
        });
        return new WorkingDayCalendar(
            settings.weekendDays,
            holidays.map((h) => h.date)
        );
    }
}
