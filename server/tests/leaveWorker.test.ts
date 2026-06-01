// Mock external deps BEFORE importing the module under test.
jest.mock('bullmq', () => ({
    // No-op Worker so importing the module doesn't open a Redis connection.
    Worker: class {
        on() { return this; }
    },
}));

const mockCache = { set: jest.fn(), del: jest.fn() };
jest.mock('../src/queues/index', () => ({
    connection: {},
    cacheConnection: mockCache,
}));

const mockPrisma = {
    company: { findMany: jest.fn() },
    leaveType: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    leaveBalance: { upsert: jest.fn() },
    leaveRequest: { findMany: jest.fn() },
};
jest.mock('../src/db', () => ({ prisma: mockPrisma }));

jest.mock('../src/utils/notification', () => ({ notifyUser: jest.fn(), notifyRole: jest.fn() }));
jest.mock('../src/utils/email.util', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined), escalationTemplate: jest.fn() }));

import { creditLeaveForMode } from '../src/queues/workers/leaveWorker';

describe('creditLeaveForMode', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('skips entirely when the period guard is already set (idempotency)', async () => {
        mockCache.set.mockResolvedValue(null); // SET NX returned nil → already credited

        await creditLeaveForMode('MONTHLY');

        expect(mockPrisma.company.findMany).not.toHaveBeenCalled();
        expect(mockPrisma.leaveBalance.upsert).not.toHaveBeenCalled();
    });

    it('credits daysPerYear/12 for MONTHLY companies', async () => {
        mockCache.set.mockResolvedValue('OK'); // guard acquired
        mockPrisma.company.findMany.mockResolvedValue([{ id: 'c1' }]);
        mockPrisma.leaveType.findMany.mockResolvedValue([{ id: 'lt1', companyId: 'c1', daysPerYear: 12 }]);
        mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1', companyId: 'c1' }]);
        mockPrisma.leaveBalance.upsert.mockResolvedValue({});

        await creditLeaveForMode('MONTHLY');

        expect(mockPrisma.leaveBalance.upsert).toHaveBeenCalledTimes(1);
        const arg = mockPrisma.leaveBalance.upsert.mock.calls[0][0];
        expect(arg.update.balance.increment).toBe(1); // 12 / 12
        expect(arg.create.balance).toBe(1);
        // Only the MONTHLY companies were queried
        expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { leaveAccrualMode: 'MONTHLY' } })
        );
    });

    it('credits the full daysPerYear for ANNUAL companies', async () => {
        mockCache.set.mockResolvedValue('OK');
        mockPrisma.company.findMany.mockResolvedValue([{ id: 'c1' }]);
        mockPrisma.leaveType.findMany.mockResolvedValue([{ id: 'lt1', companyId: 'c1', daysPerYear: 24 }]);
        mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1', companyId: 'c1' }]);
        mockPrisma.leaveBalance.upsert.mockResolvedValue({});

        await creditLeaveForMode('ANNUAL');

        const arg = mockPrisma.leaveBalance.upsert.mock.calls[0][0];
        expect(arg.update.balance.increment).toBe(24); // full year
    });

    it('does nothing (no upserts) when no companies are on the mode', async () => {
        mockCache.set.mockResolvedValue('OK');
        mockPrisma.company.findMany.mockResolvedValue([]);

        await creditLeaveForMode('MONTHLY');

        expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
        expect(mockPrisma.leaveBalance.upsert).not.toHaveBeenCalled();
    });

    it('releases the guard if crediting throws, so a later run can retry', async () => {
        mockCache.set.mockResolvedValue('OK');
        mockPrisma.company.findMany.mockRejectedValue(new Error('db down'));

        await expect(creditLeaveForMode('MONTHLY')).rejects.toThrow('db down');
        expect(mockCache.del).toHaveBeenCalled();
    });
});
