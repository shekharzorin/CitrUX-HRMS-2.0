// Mock cache + db before importing the service.
const mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
jest.mock('../src/services/cacheService', () => ({ CacheService: mockCache }));

const mockPrisma = {
    accessRole: { create: jest.fn(), findMany: jest.fn() },
    accessRolePermission: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
};
jest.mock('../src/db', () => ({ prisma: mockPrisma, Prisma: {} }));

import { RoleService } from '../src/services/role.service';

describe('RoleService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCache.get.mockResolvedValue(undefined); // default: cache miss
    });

    describe('getDefaultRoleTemplates', () => {
        it('returns 4 templates with a protected owner and an empty employee', () => {
            const t = RoleService.getDefaultRoleTemplates();
            expect(t.map((x) => x.key)).toEqual(['OWNER', 'HR', 'MANAGER', 'EMPLOYEE']);
            const owner = t.find((x) => x.key === 'OWNER')!;
            expect(owner.isOwner).toBe(true);
            expect(owner.permissions).toContain('MANAGE_COMPANY_SETTINGS');
            expect(owner.permissions).toContain('MANAGE_ROLES');
            expect(t.find((x) => x.key === 'EMPLOYEE')!.permissions).toEqual([]);
        });
    });

    describe('seedDefaultRoles', () => {
        it('creates one AccessRole per template and returns the OWNER id', async () => {
            mockPrisma.accessRole.create.mockImplementation(({ data }: any) =>
                Promise.resolve({ id: `role-${data.name}`, ...data })
            );
            const result = await RoleService.seedDefaultRoles('co-1');

            expect(mockPrisma.accessRole.create).toHaveBeenCalledTimes(4);
            expect(result.OWNER).toBe('role-Admin');
            // permissions are nested-created
            const ownerCall = mockPrisma.accessRole.create.mock.calls.find((c) => c[0].data.isOwner);
            expect(ownerCall[0].data.companyId).toBe('co-1');
            expect(ownerCall[0].data.permissions.create.length).toBeGreaterThan(0);
        });

        it('uses the provided transaction client when given', async () => {
            const tx = { accessRole: { create: jest.fn().mockResolvedValue({ id: 'x' }) } };
            await RoleService.seedDefaultRoles('co-2', tx as any);
            expect(tx.accessRole.create).toHaveBeenCalledTimes(4);
            expect(mockPrisma.accessRole.create).not.toHaveBeenCalled();
        });
    });

    describe('getEffectivePermissions (dual-read)', () => {
        it('reads from the AccessRole when accessRoleId is set', async () => {
            mockPrisma.accessRolePermission.findMany.mockResolvedValue([
                { permission: 'MANAGE_USERS' }, { permission: 'VIEW_REPORTS' },
            ]);
            const perms = await RoleService.getEffectivePermissions({ accessRoleId: 'r1', role: 'EMPLOYEE' });
            expect(perms).toEqual(['MANAGE_USERS', 'VIEW_REPORTS']);
        });

        it('falls back to the legacy enum role when no accessRoleId', async () => {
            const perms = await RoleService.getEffectivePermissions({ accessRoleId: null, role: 'HR' });
            expect(perms).toContain('MANAGE_USERS');
            expect(perms).not.toContain('MANAGE_COMPANY_SETTINGS'); // HR lacks this
            expect(mockPrisma.accessRolePermission.findMany).not.toHaveBeenCalled();
        });
    });

    describe('getPermissionsForAccessRole caching', () => {
        it('serves from cache without hitting the DB on a hit', async () => {
            mockCache.get.mockResolvedValue(['CACHED_PERM']);
            const perms = await RoleService.getPermissionsForAccessRole('r1');
            expect(perms).toEqual(['CACHED_PERM']);
            expect(mockPrisma.accessRolePermission.findMany).not.toHaveBeenCalled();
        });

        it('loads from DB and caches on a miss', async () => {
            mockPrisma.accessRolePermission.findMany.mockResolvedValue([{ permission: 'MANAGE_ASSETS' }]);
            const perms = await RoleService.getPermissionsForAccessRole('r2');
            expect(perms).toEqual(['MANAGE_ASSETS']);
            expect(mockCache.set).toHaveBeenCalledWith('accessRole:perms:r2', ['MANAGE_ASSETS'], 10 * 60 * 1000);
        });
    });

    describe('hasPermission', () => {
        it('always grants SUPER_ADMIN', async () => {
            await expect(RoleService.hasPermission({ role: 'SUPER_ADMIN' }, 'MANAGE_GLOBAL_SETTINGS')).resolves.toBe(true);
        });
        it('denies a permission the role lacks (legacy fallback)', async () => {
            await expect(RoleService.hasPermission({ role: 'EMPLOYEE' }, 'MANAGE_USERS')).resolves.toBe(false);
        });
    });

    describe('getUsersWithPermission', () => {
        it('returns [] when companyId is missing (no query)', async () => {
            await expect(RoleService.getUsersWithPermission(null, 'MANAGE_USERS')).resolves.toEqual([]);
            expect(mockPrisma.accessRole.findMany).not.toHaveBeenCalled();
        });

        it('returns [] when no role grants the permission', async () => {
            mockPrisma.accessRole.findMany.mockResolvedValue([]);
            await expect(RoleService.getUsersWithPermission('co1', 'MANAGE_PAYROLL')).resolves.toEqual([]);
            expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
        });

        it('returns active users whose AccessRole grants the permission', async () => {
            mockPrisma.accessRole.findMany.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
            mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'a@x.com' }]);
            const users = await RoleService.getUsersWithPermission('co1', 'VIEW_ALL_LEAVES');
            expect(users).toEqual([{ id: 'u1', email: 'a@x.com' }]);
            // scoped to company + active + the matching role ids
            expect(mockPrisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ companyId: 'co1', status: 'ACTIVE', accessRoleId: { in: ['r1', 'r2'] } }),
            }));
        });
    });
});
