import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cacheService';

interface AuthRequest extends Request {
    user?: any;
}

export const cacheMiddleware = (resource: string, defaultTtlMs: number) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (req.method !== 'GET') {
            return next();
        }

        const companyId = req.user?.companyId;
        if (!companyId) {
            return next(); // Cannot cache without tenant context
        }

        // e.g. path is /api/shifts/:id or /api/shifts
        const id = req.params.id || 'list';
        const key = CacheService.generateKey(companyId, resource, id);

        const cachedValue = await CacheService.get(key);
        if (cachedValue) {
            return res.json(cachedValue);
        }

        // Wrap res.json to intercept and cache the response
        const originalJson = res.json.bind(res);
        res.json = (body: any): any => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                CacheService.set(key, body, defaultTtlMs);
            }
            return originalJson(body);
        };

        next();
    };
};
