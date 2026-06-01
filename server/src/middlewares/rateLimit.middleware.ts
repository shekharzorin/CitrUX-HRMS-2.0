import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { cacheConnection } from '../queues/index';
import { Request } from 'express';

// The key generator uses companyId if available (authenticated), otherwise IP.
// For the IP fallback we run it through express-rate-limit's ipKeyGenerator so
// IPv6 addresses are normalised to a /64 subnet — otherwise an IPv6 user could
// rotate within their prefix to bypass the limit.
const keyGenerator = (req: Request): string => {
    const user = (req as any).user;
    if (user && user.companyId) {
        return `rate-limit:tenant:${user.companyId}`;
    }
    return `rate-limit:ip:${ipKeyGenerator(req.ip || '')}`;
};

// Global limit for auth endpoints (e.g. login, register, password reset)
// 20 requests per minute
export const authRateLimiter = rateLimit({
    windowMs: 60 * 1000, 
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    store: new RedisStore({
        // @ts-ignore
        sendCommand: (...args: string[]) => cacheConnection.call(...args),
    }),
    message: 'Too many authentication attempts, please try again later.'
});

// Tenant/API limit for general API endpoints
// 300 requests per minute per tenant (or IP if unauthenticated)
export const tenantRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    store: new RedisStore({
        // @ts-ignore
        sendCommand: (...args: string[]) => cacheConnection.call(...args),
    }),
    message: 'Too many requests from this tenant/IP, please try again later.'
});
