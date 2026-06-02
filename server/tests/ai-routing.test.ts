// Mock all external deps before importing the unit under test.
const mockPrisma = {
    ticket: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    supportDepartment: { findMany: jest.fn() },
    ticketCategory: { findMany: jest.fn() },
    aiJob: { create: jest.fn().mockResolvedValue({ id: 'job1' }), update: jest.fn().mockResolvedValue({}) },
};
jest.mock('../src/db', () => ({ prisma: mockPrisma, Prisma: {} }));

const mockFlags = { isEnabled: jest.fn() };
jest.mock('../src/shared/feature-flags', () => ({ featureFlags: mockFlags }));

const mockEngine = { complete: jest.fn(), provider: () => 'groq' };
jest.mock('../src/modules/ai-engine', () => ({ AiEngine: mockEngine }));

const mockActivity = { record: jest.fn() };
jest.mock('../src/modules/support-desk/activity.service', () => ({ TicketActivityService: mockActivity }));

const mockQueueSvc = { ensureDefault: jest.fn().mockResolvedValue({ id: 'DEFAULT' }) };
jest.mock('../src/modules/support-desk/support-department.service', () => ({ SupportDepartmentService: mockQueueSvc }));

import { runAiRoute } from '../src/modules/support-desk/ai-routing.service';

const lastUpdate = () => {
    const calls = mockPrisma.ticket.update.mock.calls;
    return calls[calls.length - 1][0].data;
};

describe('runAiRoute', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.ticket.update.mockResolvedValue({});
        mockPrisma.aiJob.create.mockResolvedValue({ id: 'job1' });
        mockFlags.isEnabled.mockResolvedValue(true);
        mockPrisma.supportDepartment.findMany.mockResolvedValue([{ id: 'Q1' }, { id: 'Q2' }]);
        mockPrisma.ticketCategory.findMany.mockResolvedValue([{ id: 'C1', supportDepartmentId: 'Q1' }]);
    });

    it('is idempotent — skips already-COMPLETED tickets', async () => {
        mockPrisma.ticket.findUnique.mockResolvedValue({ id: 't', aiStatus: 'COMPLETED' });
        await runAiRoute('t');
        expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
        expect(mockEngine.complete).not.toHaveBeenCalled();
    });

    it('marks SKIPPED when the AI flag is off', async () => {
        mockPrisma.ticket.findUnique.mockResolvedValue({ id: 't', companyId: 'c', aiStatus: 'PENDING' });
        mockFlags.isEnabled.mockResolvedValue(false);
        await runAiRoute('t');
        expect(lastUpdate()).toEqual({ aiStatus: 'SKIPPED' });
        expect(mockPrisma.aiJob.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SKIPPED' }) }));
        expect(mockEngine.complete).not.toHaveBeenCalled();
    });

    it('respects human queue, fills missing category + priority on high confidence', async () => {
        mockPrisma.ticket.findUnique.mockResolvedValue({
            id: 't', companyId: 'c', aiStatus: 'PENDING', supportDepartmentId: 'Q1', categoryId: null, priority: 'MEDIUM', subject: 's', description: 'd',
        });
        mockEngine.complete.mockResolvedValue(JSON.stringify({ supportDepartmentId: 'Q2', categoryId: 'C1', priority: 'HIGH', confidence: 0.9 }));
        await runAiRoute('t');
        const d = lastUpdate();
        expect(d.supportDepartmentId).toBeUndefined(); // human Q1 kept, not overridden
        expect(d.categoryId).toBe('C1');               // filled (belongs to Q1)
        expect(d.priority).toBe('HIGH');               // refined from default MEDIUM
        expect(d.aiCategorized).toBe(true);
        expect(d.aiStatus).toBe('COMPLETED');
        expect(mockActivity.record).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: 'AI_CATEGORIZED' }));
    });

    it('low confidence applies nothing and writes no AI_CATEGORIZED activity', async () => {
        mockPrisma.ticket.findUnique.mockResolvedValue({
            id: 't', companyId: 'c', aiStatus: 'PENDING', supportDepartmentId: 'Q1', categoryId: null, priority: 'MEDIUM', subject: 's', description: 'd',
        });
        mockEngine.complete.mockResolvedValue(JSON.stringify({ supportDepartmentId: 'Q2', categoryId: 'C1', priority: 'HIGH', confidence: 0.3 }));
        await runAiRoute('t');
        const d = lastUpdate();
        expect(d.categoryId).toBeUndefined();
        expect(d.priority).toBeUndefined();
        expect(d.aiStatus).toBe('COMPLETED');
        expect(mockActivity.record).not.toHaveBeenCalled();
    });

    it('ignores hallucinated category not in the chosen queue', async () => {
        mockPrisma.ticket.findUnique.mockResolvedValue({
            id: 't', companyId: 'c', aiStatus: 'PENDING', supportDepartmentId: 'Q1', categoryId: null, priority: 'MEDIUM', subject: 's', description: 'd',
        });
        // C1 belongs to Q1 in the catalog, but AI returns a bogus id
        mockEngine.complete.mockResolvedValue(JSON.stringify({ categoryId: 'BOGUS', confidence: 0.95 }));
        await runAiRoute('t');
        expect(lastUpdate().categoryId).toBeUndefined();
    });
});
