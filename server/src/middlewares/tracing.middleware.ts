import { Request, Response, NextFunction } from 'express';
import { createNamespace, getNamespace } from 'cls-hooked';
import { v4 as uuidv4 } from 'uuid';

export const TRACE_NAMESPACE = 'hrms-trace-namespace';
const session = createNamespace(TRACE_NAMESPACE);

export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    session.run(() => {
        const traceId = req.headers['x-request-id'] || uuidv4();
        session.set('traceId', traceId);
        session.set('companyId', (req as any).user?.companyId || 'SYSTEM');
        
        // Add to response headers for tracking
        res.setHeader('X-Request-Id', traceId as string);
        next();
    });
};

export const getTraceId = (): string => {
    const ns = getNamespace(TRACE_NAMESPACE);
    return ns && ns.active ? ns.get('traceId') : 'NO-TRACE-ID';
};

export const getTraceCompanyId = (): string => {
    const ns = getNamespace(TRACE_NAMESPACE);
    return ns && ns.active ? ns.get('companyId') : 'NO-COMPANY';
};
