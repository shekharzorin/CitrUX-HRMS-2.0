export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';

/**
 * Code-defined permission catalog. This is the single source of truth for the
 * capabilities the app checks. Per-tenant AccessRoles (RBAC v2) grant a subset
 * of these; the legacy `Role` enum maps to them via `rolePermissions` below.
 *
 * Adding a capability = add it here (+ optionally to a role's defaults). Exposed
 * to the role-management UI via a future GET /api/permissions.
 */
export const PERMISSIONS = [
    // Platform / tenant configuration
    'MANAGE_GLOBAL_SETTINGS',   // platform-wide systemSetting keys (SUPER_ADMIN)
    'MANAGE_COMPANY_SETTINGS',  // tenant config: branding, leave types, year-end
    'MANAGE_ROLES',             // create/edit a tenant's roles & permissions
    // People & payroll
    'MANAGE_USERS',
    'MANAGE_PAYROLL',
    // Leave
    'VIEW_ALL_LEAVES',
    'APPROVE_LEAVES',
    // Documents
    'MANAGE_DOCUMENTS',
    'VIEW_USER_DOCUMENTS',
    // Attendance & time
    'MANAGE_ATTENDANCE',
    'APPROVE_ATTENDANCE',
    'APPROVE_TIMESHEETS',
    // Tasks & reports & appraisals
    'ASSIGN_TASKS',
    'VIEW_REPORTS',
    'SUBMIT_APPRAISAL',
    'VIEW_ALL_APPRAISALS',
    // Assets, expenses
    'MANAGE_ASSETS',
    'APPROVE_EXPENSES',
    'MANAGE_EXPENSE_CONFIG',
    // Company structure & config
    'MANAGE_HOLIDAYS',
    'MANAGE_JOB_ROLES',
    'MANAGE_ONBOARDING',
    'MANAGE_OFFBOARDING',
    'MANAGE_ORG_STRUCTURE',
    'MANAGE_SHIFTS',
    // Recruitment & certificates
    'ISSUE_CERTIFICATES',
    'MANAGE_RECRUITMENT',
    // Platform observability
    'VIEW_SYSTEM_HEALTH',
] as const;

export type Permission = typeof PERMISSIONS[number];

export class PermissionService {
    /**
     * Default permission sets per legacy role. These are the fallback used until
     * a user is assigned a per-tenant AccessRole, AND the templates used to seed
     * a new tenant's default roles (see RoleService).
     */
    private static rolePermissions: Record<Role, Permission[]> = {
        // Platform operator: everything.
        SUPER_ADMIN: [...PERMISSIONS],
        // Company owner/admin: full control of THEIR tenant (no global settings).
        ADMIN: [
            'MANAGE_COMPANY_SETTINGS', 'MANAGE_ROLES', 'MANAGE_USERS', 'MANAGE_PAYROLL',
            'VIEW_ALL_LEAVES', 'APPROVE_LEAVES', 'MANAGE_DOCUMENTS', 'VIEW_USER_DOCUMENTS',
            'MANAGE_ATTENDANCE', 'APPROVE_ATTENDANCE', 'APPROVE_TIMESHEETS', 'ASSIGN_TASKS',
            'VIEW_REPORTS', 'SUBMIT_APPRAISAL', 'VIEW_ALL_APPRAISALS', 'MANAGE_ASSETS',
            'APPROVE_EXPENSES', 'MANAGE_EXPENSE_CONFIG', 'MANAGE_HOLIDAYS', 'MANAGE_JOB_ROLES',
            'MANAGE_ONBOARDING', 'MANAGE_OFFBOARDING', 'MANAGE_ORG_STRUCTURE', 'MANAGE_SHIFTS',
            'ISSUE_CERTIFICATES', 'MANAGE_RECRUITMENT', 'VIEW_SYSTEM_HEALTH',
        ],
        // People-ops: no company config/payroll (distinct from ADMIN).
        HR: [
            'MANAGE_USERS', 'VIEW_ALL_LEAVES', 'APPROVE_LEAVES', 'MANAGE_DOCUMENTS',
            'VIEW_USER_DOCUMENTS', 'MANAGE_ATTENDANCE', 'APPROVE_ATTENDANCE', 'APPROVE_TIMESHEETS',
            'ASSIGN_TASKS', 'VIEW_REPORTS', 'SUBMIT_APPRAISAL', 'VIEW_ALL_APPRAISALS',
            'APPROVE_EXPENSES', 'MANAGE_HOLIDAYS', 'MANAGE_JOB_ROLES', 'MANAGE_ONBOARDING',
            'MANAGE_OFFBOARDING', 'MANAGE_ORG_STRUCTURE', 'MANAGE_SHIFTS', 'ISSUE_CERTIFICATES',
            'MANAGE_RECRUITMENT',
        ],
        MANAGER: [
            'APPROVE_LEAVES', 'APPROVE_ATTENDANCE', 'APPROVE_TIMESHEETS', 'APPROVE_EXPENSES',
            'VIEW_USER_DOCUMENTS', 'ASSIGN_TASKS', 'VIEW_REPORTS', 'SUBMIT_APPRAISAL',
        ],
        EMPLOYEE: [],
    };

    /** Check if a legacy role has a permission (static map). */
    static hasPermission(role: Role, permission: Permission): boolean {
        const permissions = this.rolePermissions[role] || [];
        return permissions.includes(permission);
    }

    /** All permissions for a legacy role (static map). */
    static getPermissionsForRole(role: Role): Permission[] {
        return this.rolePermissions[role] || [];
    }
}
