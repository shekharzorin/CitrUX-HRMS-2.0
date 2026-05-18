export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';

export type Permission =
    | 'MANAGE_USERS'
    | 'VIEW_ALL_LEAVES'
    | 'APPROVE_LEAVES'
    | 'MANAGE_PAYROLL'
    | 'MANAGE_SETTINGS'
    | 'VIEW_REPORTS'
    | 'MANAGE_DOCUMENTS'
    | 'SUBMIT_APPRAISAL'
    | 'VIEW_ALL_APPRAISALS'
    | 'ASSIGN_TASKS'
    | 'MANAGE_ATTENDANCE'
    | 'APPROVE_ATTENDANCE';

export class PermissionService {
    private static rolePermissions: Record<Role, Permission[]> = {
        SUPER_ADMIN: [
            'MANAGE_USERS', 'VIEW_ALL_LEAVES', 'APPROVE_LEAVES', 'MANAGE_PAYROLL',
            'MANAGE_SETTINGS', 'VIEW_REPORTS', 'MANAGE_DOCUMENTS', 'SUBMIT_APPRAISAL',
            'VIEW_ALL_APPRAISALS', 'ASSIGN_TASKS', 'MANAGE_ATTENDANCE', 'APPROVE_ATTENDANCE'
        ],
        ADMIN: [
            'MANAGE_USERS', 'VIEW_ALL_LEAVES', 'APPROVE_LEAVES', 'MANAGE_PAYROLL',
            'VIEW_REPORTS', 'MANAGE_DOCUMENTS', 'SUBMIT_APPRAISAL', 'VIEW_ALL_APPRAISALS',
            'ASSIGN_TASKS', 'MANAGE_ATTENDANCE', 'APPROVE_ATTENDANCE'
        ],
        HR: [
            'MANAGE_USERS', 'VIEW_ALL_LEAVES', 'APPROVE_LEAVES', 'MANAGE_PAYROLL',
            'VIEW_REPORTS', 'MANAGE_DOCUMENTS', 'SUBMIT_APPRAISAL', 'VIEW_ALL_APPRAISALS',
            'ASSIGN_TASKS', 'MANAGE_ATTENDANCE', 'APPROVE_ATTENDANCE'
        ],
        MANAGER: [
            'APPROVE_LEAVES', 'VIEW_REPORTS', 'SUBMIT_APPRAISAL', 'ASSIGN_TASKS', 'APPROVE_ATTENDANCE'
        ],
        EMPLOYEE: []
    };

    /**
     * Check if a specific role has a certain permission.
     */
    static hasPermission(role: Role, permission: Permission): boolean {
        const permissions = this.rolePermissions[role] || [];
        return permissions.includes(permission);
    }

    /**
     * Get all permissions assigned to a role.
     */
    static getPermissionsForRole(role: Role): Permission[] {
        return this.rolePermissions[role] || [];
    }
}
