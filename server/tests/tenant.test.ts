import { Request, Response, NextFunction } from 'express';
import { tenantScope, getTenantScope, assertSameCompany } from '../src/middlewares/tenant.middleware';
import { AuthRequest } from '../src/middlewares/auth.middleware';

describe('Multi-Tenant Logic Validation', () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();

    beforeEach(() => {
        mockReq = {
            query: {},
            user: {
                userId: 'user-1',
                role: 'ADMIN',
                companyId: 'company-A'
            }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('tenantScope Middleware', () => {
        it('should allow valid tenant through', () => {
            tenantScope(mockReq as AuthRequest, mockRes as Response, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should block user with no companyId', () => {
            mockReq.user!.companyId = null;
            tenantScope(mockReq as AuthRequest, mockRes as Response, nextFunction);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('No company associated')
            }));
        });

        it('should allow SUPER_ADMIN with no companyId', () => {
            mockReq.user = { userId: 's-1', role: 'SUPER_ADMIN', companyId: null };
            tenantScope(mockReq as AuthRequest, mockRes as Response, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should allow SUPER_ADMIN to target a company via query param', () => {
            mockReq.user = { userId: 's-1', role: 'SUPER_ADMIN', companyId: null };
            mockReq.query = { companyId: 'company-B' };
            tenantScope(mockReq as AuthRequest, mockRes as Response, nextFunction);
            expect(mockReq.user.companyId).toBe('company-B');
            expect(nextFunction).toHaveBeenCalled();
        });
    });

    describe('getTenantScope Utility', () => {
        it('should return companyId filter for normal users', () => {
            const scope = getTenantScope(mockReq as AuthRequest);
            expect(scope).toEqual({ companyId: 'company-A' });
        });

        it('should return empty fragment for SUPER_ADMIN with no company context', () => {
            mockReq.user = { userId: 's-1', role: 'SUPER_ADMIN', companyId: null };
            const scope = getTenantScope(mockReq as AuthRequest);
            expect(scope).toEqual({});
        });
    });

    describe('assertSameCompany Security Validator (BOLA/IDOR Check)', () => {
        it('should return true if companyIds match', () => {
            const result = assertSameCompany('company-A', mockReq as AuthRequest, mockRes as Response);
            expect(result).toBe(true);
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should return false and 403 if companyIds mismatch', () => {
            const result = assertSameCompany('company-B', mockReq as AuthRequest, mockRes as Response);
            expect(result).toBe(false);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('should return true for SUPER_ADMIN regardless of mismatch', () => {
            mockReq.user!.role = 'SUPER_ADMIN';
            const result = assertSameCompany('company-B', mockReq as AuthRequest, mockRes as Response);
            expect(result).toBe(true);
        });
    });
});
