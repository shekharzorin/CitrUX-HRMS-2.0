import { Response, NextFunction } from 'express';
import { prisma } from '../db';
import { CacheService } from '../services/cacheService';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * Feature flags — phased, reversible rollout. Safe default is DISABLED.
 *
 * Resolution order (first match wins):
 *   1. per-company override  → SystemSetting key `feature:<FLAG>:<companyId>`
 *   2. global override       → SystemSetting key `feature:<FLAG>`
 *   3. env default           → process.env.FEATURE_<FLAG> === 'true'
 *   4. false                 → safe default
 *
 * SystemSetting is SUPER_ADMIN-controlled, so flags are a platform decision
 * (right for a phased per-tenant rollout). Reads are cached (with negative
 * caching); a future flag-toggle API must call `invalidate()`.
 */
export const FEATURE_FLAGS = ['SUPPORT_DESK', 'SUPPORT_AI_CATEGORIZATION', 'ATTENDANCE_FRAMEWORK', 'PAYROLL_V2'] as const;
export type FeatureFlag = typeof FEATURE_FLAGS[number];

const FLAG_TTL_MS = 5 * 60 * 1000;
const NULL_SENTINEL = '__UNSET__';

const settingKey = (flag: FeatureFlag, companyId?: string | null) =>
    companyId ? `feature:${flag}:${companyId}` : `feature:${flag}`;
const flagCacheKey = (key: string) => `ff:${key}`;

class FeatureFlagService {
    /** Cached read of a SystemSetting flag key. Returns undefined if unset. */
    private async readSetting(key: string): Promise<string | undefined> {
        const cached = await CacheService.get<string>(flagCacheKey(key));
        if (cached !== undefined) return cached === NULL_SENTINEL ? undefined : cached;
        const row = await prisma.systemSetting.findUnique({ where: { key } });
        const value = row?.value;
        await CacheService.set(flagCacheKey(key), value ?? NULL_SENTINEL, FLAG_TTL_MS);
        return value;
    }

    async isEnabled(flag: FeatureFlag, companyId?: string | null): Promise<boolean> {
        if (companyId) {
            const perCompany = await this.readSetting(settingKey(flag, companyId));
            if (perCompany !== undefined) return perCompany === 'true';
        }
        const global = await this.readSetting(settingKey(flag));
        if (global !== undefined) return global === 'true';

        const env = process.env[`FEATURE_${flag}`];
        if (env !== undefined) return env === 'true';

        return false; // safe default
    }

    /** Map of every flag → enabled, for embedding in /auth/me & login responses. */
    async getEnabledFlags(companyId?: string | null): Promise<Record<FeatureFlag, boolean>> {
        const out = {} as Record<FeatureFlag, boolean>;
        for (const flag of FEATURE_FLAGS) {
            out[flag] = await this.isEnabled(flag, companyId);
        }
        return out;
    }

    /** Invalidate cached flag reads after a flag changes (future toggle API). */
    async invalidate(flag: FeatureFlag, companyId?: string | null): Promise<void> {
        await CacheService.del(flagCacheKey(settingKey(flag, companyId)));
    }
}

export const featureFlags = new FeatureFlagService();

/**
 * Route-mount guard. When the flag is off for the caller's company the whole
 * surface is invisible (404). Mount AFTER authenticateToken so companyId is known.
 * (Not mounted yet — the support-desk router will use it in a later phase.)
 */
export const requireFeature = (flag: FeatureFlag) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (await featureFlags.isEnabled(flag, req.user?.companyId)) return next();
            return res.status(404).json({ message: 'Not found' });
        } catch (err) {
            next(err);
        }
    };
};
