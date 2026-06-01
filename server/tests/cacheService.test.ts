const mockConn = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
};
jest.mock('../src/queues/index', () => ({ cacheConnection: mockConn, connection: {} }));

import { CacheService } from '../src/services/cacheService';

describe('CacheService', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('generateKey', () => {
        it('builds a strict tenant-scoped key', () => {
            expect(CacheService.generateKey('c1', 'shifts')).toBe('tenant:c1:resource:shifts:list');
            expect(CacheService.generateKey('c1', 'shifts', 'abc')).toBe('tenant:c1:resource:shifts:abc');
        });
    });

    describe('get', () => {
        it('parses stored JSON', async () => {
            mockConn.get.mockResolvedValue(JSON.stringify({ a: 1 }));
            await expect(CacheService.get('k')).resolves.toEqual({ a: 1 });
        });
        it('returns undefined on a miss', async () => {
            mockConn.get.mockResolvedValue(null);
            await expect(CacheService.get('k')).resolves.toBeUndefined();
        });
        it('fails soft (undefined) when Redis throws', async () => {
            mockConn.get.mockRejectedValue(new Error('redis down'));
            await expect(CacheService.get('k')).resolves.toBeUndefined();
        });
    });

    describe('set', () => {
        it('serializes the value and sets a PX (ms) TTL', async () => {
            mockConn.set.mockResolvedValue('OK');
            await CacheService.set('k', { a: 1 }, 5000);
            expect(mockConn.set).toHaveBeenCalledWith('k', JSON.stringify({ a: 1 }), 'PX', 5000);
        });
    });

    describe('delByPattern', () => {
        it('scans with the cursor and deletes matched keys', async () => {
            mockConn.scan
                .mockResolvedValueOnce(['7', ['k1', 'k2']])
                .mockResolvedValueOnce(['0', ['k3']]);
            mockConn.del.mockResolvedValue(1);

            await CacheService.delByPattern('tenant:c1:resource:shifts:*');

            expect(mockConn.scan).toHaveBeenCalledTimes(2);
            expect(mockConn.del).toHaveBeenCalledWith('k1', 'k2');
            expect(mockConn.del).toHaveBeenCalledWith('k3');
        });
    });
});
