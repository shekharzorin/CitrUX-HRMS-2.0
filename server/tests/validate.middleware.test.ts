import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../src/middlewares/validate.middleware';

describe('validate middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let statusCode: number | undefined;
    let jsonBody: any;

    beforeEach(() => {
        statusCode = undefined;
        jsonBody = undefined;
        req = { body: {}, params: {}, query: {} };
        res = {
            status: jest.fn().mockImplementation((code: number) => { statusCode = code; return res as Response; }),
            json: jest.fn().mockImplementation((body: any) => { jsonBody = body; return res as Response; }),
        };
        next = jest.fn();
    });

    const bodySchema = z.object({ name: z.string().min(1) }).passthrough();

    it('calls next() when the body is valid', () => {
        req.body = { name: 'ok', extra: 1 };
        validate({ body: bodySchema })(req as Request, res as Response, next);
        expect(next).toHaveBeenCalled();
        expect(statusCode).toBeUndefined();
    });

    it('returns 400 with structured errors when the body is invalid', () => {
        req.body = { name: '' };
        validate({ body: bodySchema })(req as Request, res as Response, next);
        expect(next).not.toHaveBeenCalled();
        expect(statusCode).toBe(400);
        expect(jsonBody.message).toBe('Validation failed');
        expect(jsonBody.errors[0].field).toBe('body.name');
    });

    it('reassigns req.body with the parsed value (and keeps passthrough fields)', () => {
        req.body = { name: 'ok', extra: 'kept' };
        validate({ body: bodySchema })(req as Request, res as Response, next);
        expect(req.body).toEqual({ name: 'ok', extra: 'kept' });
    });

    it('does not reassign req.query (Express 5 read-only) but still validates it', () => {
        const querySchema = z.object({ page: z.string() });
        req.query = { page: 123 as any };
        validate({ query: querySchema })(req as Request, res as Response, next);
        expect(statusCode).toBe(400);
        expect(jsonBody.errors[0].field).toBe('query.page');
    });
});
