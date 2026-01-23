
export const canManageUser = (currentUserRole: string | undefined, targetUserRole: string | undefined): boolean => {
    if (!currentUserRole || !targetUserRole) return false;

    // Normalize
    const actor = currentUserRole.toUpperCase();
    const target = targetUserRole.toUpperCase();

    if (actor === 'SUPER_ADMIN') return true; // Super Admin can do anything
    if (actor === 'ADMIN') {
        // Admin can manage everyone except Super Admin (strictly speaking, usually SA is protected at DB level too)
        return target !== 'SUPER_ADMIN';
    }

    if (actor === 'HR') {
        // HR can only manage Employees and Managers
        return target === 'EMPLOYEE' || target === 'MANAGER';
    }

    // Managers and Employees cannot manage users in this context (List View actions)
    return false;
};
