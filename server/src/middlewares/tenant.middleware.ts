import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

/**
 * Multi-Tenant Scope Middleware
 *
 * Automatically enforces tenant isolation based on the companyId
 * embedded in the JWT. Every authenticated route should use this
 * alongside authenticateToken.
 *
 * Rules:
 *  - SUPER_ADMIN → passes through; may optionally scope via ?companyId= query param
 *  - All other roles → MUST have a companyId in their token or the request is rejected
 */
export const tenantScope = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.user.role.toUpperCase() === 'SUPER_ADMIN') {
        // Super admin can optionally target a specific company via query param
        if (req.query.companyId && typeof req.query.companyId === 'string') {
            req.user.companyId = req.query.companyId;
        }
        return next();
    }

    if (!req.user.companyId) {
        return res.status(403).json({
            message: 'No company associated with your account. Contact your Super Admin.'
        });
    }

    next();
};

/**
 * getTenantScope — returns the Prisma `where` fragment to scope queries by companyId.
 *
 * Usage in any controller:
 *   const scope = getTenantScope(req);
 *   const users = await prisma.user.findMany({ where: { ...scope, ...otherFilters } });
 *
 * For SUPER_ADMIN with no companyId set: returns {} (sees all data).
 * For everyone else: returns { companyId: '...' }.
 */
export const getTenantScope = (req: AuthRequest): { companyId?: string } => {
    const { role, companyId } = req.user!;

    if (role.toUpperCase() === 'SUPER_ADMIN' && !companyId) {
        return {}; // Unrestricted — sees all companies
    }

    return { companyId: companyId ?? undefined };
};

/**
 * assertSameCompany — validates that a fetched resource belongs to the
 * requesting user's company. Call this after a DB fetch to prevent
 * cross-company access via ID enumeration attacks.
 *
 * Returns true if access is allowed, false if denied (response already sent).
 */
export const assertSameCompany = (
    resourceCompanyId: string | null | undefined,
    req: AuthRequest,
    res: Response
): boolean => {
    if (req.user?.role.toUpperCase() === 'SUPER_ADMIN') return true;

    if (!resourceCompanyId || resourceCompanyId !== req.user?.companyId) {
        res.status(403).json({ message: 'Access denied: cross-company access blocked' });
        return false;
    }

    return true;
};
