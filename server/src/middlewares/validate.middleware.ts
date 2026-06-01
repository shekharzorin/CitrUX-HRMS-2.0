import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

interface ValidationSchemas {
    body?: ZodType;
    params?: ZodType;
    query?: ZodType;
}

/**
 * Reusable request-validation middleware backed by Zod.
 *
 * Usage:
 *   router.post('/login', validate({ body: loginSchema }), login);
 *
 * Validates body/params/query against the supplied schemas and returns a
 * structured 400 on failure. Only `req.body` is reassigned with the parsed
 * (coerced) value — `req.query` is a read-only getter in Express 5, so we
 * validate it without reassigning.
 */
export const validate = (schemas: ValidationSchemas) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const errors: { field: string; message: string }[] = [];

        if (schemas.body) {
            const result = schemas.body.safeParse(req.body);
            if (!result.success) {
                for (const issue of result.error.issues) {
                    errors.push({ field: `body.${issue.path.join('.')}`, message: issue.message });
                }
            } else {
                req.body = result.data;
            }
        }

        if (schemas.params) {
            const result = schemas.params.safeParse(req.params);
            if (!result.success) {
                for (const issue of result.error.issues) {
                    errors.push({ field: `params.${issue.path.join('.')}`, message: issue.message });
                }
            }
        }

        if (schemas.query) {
            const result = schemas.query.safeParse(req.query);
            if (!result.success) {
                for (const issue of result.error.issues) {
                    errors.push({ field: `query.${issue.path.join('.')}`, message: issue.message });
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Validation failed', errors });
        }
        next();
    };
};
