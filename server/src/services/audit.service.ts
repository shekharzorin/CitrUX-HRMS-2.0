import { prisma } from '../db';

export class AuditService {
    /**
     * Log a user activity or system event securely into the AuditLog table.
     * @param performedBy The user ID of the person performing the action
     * @param action The specific action taken (e.g., 'CREATE', 'UPDATE', 'DELETE', 'APPROVE')
     * @param entityType The entity being modified (e.g., 'EMPLOYEE', 'LEAVE_REQUEST', 'PAYROLL')
     * @param entityId The specific record ID being modified
     * @param details Additional JSON context stringified (e.g., diff of what changed)
     */
    static async log(
        performedBy: string,
        action: string,
        entityType: string,
        entityId: string,
        details: any = {}
    ) {
        try {
            await prisma.auditLog.create({
                data: {
                    performedBy,
                    action: action.toUpperCase(),
                    entityType: entityType.toUpperCase(),
                    entityId,
                    details: typeof details === 'string' ? details : JSON.stringify(details),
                }
            });
        } catch (error) {
            console.error('[AuditService] Failed to create audit log:', error);
            // Non-blocking error. System should continue functioning even if audit log fails momentarily.
        }
    }
}
