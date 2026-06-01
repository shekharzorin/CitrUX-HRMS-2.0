import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../src/validators/auth.validator';
import {
    applyLeaveSchema,
    createLeaveTypeSchema,
    payrollRunSchema,
    createUserSchema,
    submitClaimSchema,
} from '../src/validators/schemas';

describe('Auth validators', () => {
    describe('loginSchema', () => {
        it('accepts a valid email + password', () => {
            const r = loginSchema.safeParse({ email: 'a@b.com', password: 'secret' });
            expect(r.success).toBe(true);
        });
        it('rejects an invalid email', () => {
            const r = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
            expect(r.success).toBe(false);
        });
        it('rejects an empty password', () => {
            const r = loginSchema.safeParse({ email: 'a@b.com', password: '' });
            expect(r.success).toBe(false);
        });
    });

    describe('forgotPasswordSchema', () => {
        it('requires a valid email', () => {
            expect(forgotPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
            expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
        });
    });

    describe('resetPasswordSchema', () => {
        const base = { token: 't', uid: 'u' };
        it('accepts a strong password', () => {
            const r = resetPasswordSchema.safeParse({ ...base, newPassword: 'Str0ng!Pass' });
            expect(r.success).toBe(true);
        });
        it('rejects a weak password (no special char / too short)', () => {
            expect(resetPasswordSchema.safeParse({ ...base, newPassword: 'weak' }).success).toBe(false);
            expect(resetPasswordSchema.safeParse({ ...base, newPassword: 'alllowercase1' }).success).toBe(false);
        });
        it('rejects missing token/uid', () => {
            expect(resetPasswordSchema.safeParse({ token: '', uid: 'u', newPassword: 'Str0ng!Pass' }).success).toBe(false);
        });
    });
});

describe('Domain schemas', () => {
    it('applyLeaveSchema requires the core fields and passes through extras', () => {
        const r = applyLeaveSchema.safeParse({
            leaveTypeId: 'lt1',
            startDate: '2026-01-01',
            endDate: '2026-01-02',
            somethingExtra: 'kept',
        });
        expect(r.success).toBe(true);
        // passthrough preserves unmodeled fields
        expect((r as any).data.somethingExtra).toBe('kept');
    });

    it('applyLeaveSchema rejects an invalid duration enum', () => {
        const r = applyLeaveSchema.safeParse({
            leaveTypeId: 'lt1', startDate: 'a', endDate: 'b', duration: 'QUARTER_DAY',
        });
        expect(r.success).toBe(false);
    });

    it('createLeaveTypeSchema coerces numeric daysPerYear from a string', () => {
        const r = createLeaveTypeSchema.safeParse({ name: 'Casual', code: 'CL', daysPerYear: '12' });
        expect(r.success).toBe(true);
        expect((r as any).data.daysPerYear).toBe(12);
    });

    it('payrollRunSchema requires a non-empty userIds array and valid month', () => {
        expect(payrollRunSchema.safeParse({ userIds: [], month: 5, year: 2026 }).success).toBe(false);
        expect(payrollRunSchema.safeParse({ userIds: ['u1'], month: 13, year: 2026 }).success).toBe(false);
        expect(payrollRunSchema.safeParse({ userIds: ['u1'], month: 5, year: 2026 }).success).toBe(true);
    });

    it('createUserSchema requires email + password but allows profile fields through', () => {
        const r = createUserSchema.safeParse({
            email: 'e@x.com', password: 'secret', firstName: 'A', aadhaarNumber: '123',
        });
        expect(r.success).toBe(true);
        expect((r as any).data.firstName).toBe('A');
        expect(createUserSchema.safeParse({ email: 'bad', password: 'secret' }).success).toBe(false);
    });

    it('submitClaimSchema requires a positive amount', () => {
        expect(submitClaimSchema.safeParse({ categoryId: 'c1', amount: -5 }).success).toBe(false);
        expect(submitClaimSchema.safeParse({ categoryId: 'c1', amount: 100 }).success).toBe(true);
    });
});
