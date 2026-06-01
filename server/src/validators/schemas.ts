import { z } from 'zod';

/**
 * Request body schemas for mutation endpoints.
 *
 * Design notes:
 *  - All object schemas use `.passthrough()` so fields a controller reads but
 *    that aren't modeled here are NOT stripped from req.body. These schemas
 *    enforce presence/type of the clearly-required fields and let the rest
 *    through unchanged — additive validation that won't break existing clients.
 *  - Numeric fields use z.coerce.number() to tolerate form-encoded strings.
 *  - Date fields are validated as non-empty strings (controllers call new Date()).
 */

const nonEmpty = (label: string) => z.string().min(1, `${label} is required`);
const idString = z.string().min(1);

// ── Users ────────────────────────────────────────────────────────────────────
export const createUserSchema = z.object({
    email: z.string().email('A valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: nonEmpty('Role').optional(),
}).passthrough();

export const updateUserSchema = z.object({}).passthrough();

// ── Profile ──────────────────────────────────────────────────────────────────
export const updateProfileSchema = z.object({}).passthrough();

export const changePasswordSchema = z.object({
    currentPassword: nonEmpty('Current password'),
    newPassword: z.string()
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.'
        ),
}).passthrough();

// ── Leave ────────────────────────────────────────────────────────────────────
export const applyLeaveSchema = z.object({
    leaveTypeId: nonEmpty('Leave type'),
    startDate: nonEmpty('Start date'),
    endDate: nonEmpty('End date'),
    reason: z.string().optional(),
    duration: z.enum(['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF']).optional(),
}).passthrough();

export const leaveStatusSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED', 'PENDING']),
    comment: z.string().optional(),
}).passthrough();

export const createLeaveTypeSchema = z.object({
    name: nonEmpty('Name'),
    code: nonEmpty('Code'),
    daysPerYear: z.coerce.number().int().nonnegative(),
    carryForward: z.boolean().optional(),
}).passthrough();

export const encashLeaveSchema = z.object({
    leaveTypeId: nonEmpty('Leave type'),
    days: z.coerce.number().positive(),
    reason: z.string().optional(),
}).passthrough();

export const encashmentStatusSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED', 'PAID', 'PENDING']),
    comment: z.string().optional(),
    amount: z.coerce.number().optional(),
}).passthrough();

// ── Attendance ───────────────────────────────────────────────────────────────
export const requestAdjustmentSchema = z.object({
    date: nonEmpty('Date'),
    reason: nonEmpty('Reason'),
    clockIn: z.string().optional(),
    clockOut: z.string().optional(),
}).passthrough();

export const respondAdjustmentSchema = z.object({
    id: idString,
    status: z.enum(['APPROVED', 'REJECTED']),
    comment: z.string().optional(),
}).passthrough();

export const overrideAttendanceSchema = z.object({
    userId: idString,
    date: nonEmpty('Date'),
}).passthrough();

// ── Shifts ───────────────────────────────────────────────────────────────────
export const shiftSchema = z.object({
    name: nonEmpty('Name'),
    startTime: nonEmpty('Start time'),
    endTime: nonEmpty('End time'),
}).passthrough();

export const assignShiftSchema = z.object({
    userId: idString,
    shiftId: idString,
}).passthrough();

export const bulkAssignShiftSchema = z.object({
    userIds: z.array(idString).min(1, 'At least one user is required'),
    shiftId: idString,
}).passthrough();

// ── Documents ────────────────────────────────────────────────────────────────
export const uploadDocumentSchema = z.object({
    category: nonEmpty('Category'),
}).passthrough();

export const verifyDocumentSchema = z.object({
    status: nonEmpty('Status'),
}).passthrough();

// ── Tasks ────────────────────────────────────────────────────────────────────
export const createTaskSchema = z.object({
    title: nonEmpty('Title'),
}).passthrough();

// ── Expenses ─────────────────────────────────────────────────────────────────
export const createExpenseCategorySchema = z.object({
    name: nonEmpty('Name'),
    limit: z.coerce.number().optional(),
}).passthrough();

export const submitClaimSchema = z.object({
    categoryId: idString,
    amount: z.coerce.number().positive(),
}).passthrough();

export const statusOnlySchema = z.object({
    status: nonEmpty('Status'),
}).passthrough();

// ── Performance / Engagement ─────────────────────────────────────────────────
export const createGoalSchema = z.object({
    title: nonEmpty('Title'),
}).passthrough();

export const reviewSchema = z.object({
    userId: idString,
    period: nonEmpty('Period'),
    rating: z.coerce.number(),
    feedback: z.string().optional(),
}).passthrough();

export const recognitionSchema = z.object({
    userId: idString,
    message: nonEmpty('Message'),
}).passthrough();

// ── Assets ───────────────────────────────────────────────────────────────────
export const createAssetSchema = z.object({
    name: nonEmpty('Name'),
    type: nonEmpty('Type'),
}).passthrough();

export const assignAssetSchema = z.object({
    userId: idString,
}).passthrough();

// ── Organization ─────────────────────────────────────────────────────────────
export const createBranchSchema = z.object({
    name: nonEmpty('Name'),
}).passthrough();

export const createDepartmentSchema = z.object({
    name: nonEmpty('Name'),
}).passthrough();

// ── Recruitment ──────────────────────────────────────────────────────────────
export const createJobSchema = z.object({
    title: nonEmpty('Title'),
    department: nonEmpty('Department'),
}).passthrough();

export const applyForJobSchema = z.object({
    jobId: idString,
    applicantName: nonEmpty('Applicant name'),
    email: z.string().email('A valid email is required'),
}).passthrough();

// ── Offboarding ──────────────────────────────────────────────────────────────
export const resignSchema = z.object({
    reason: nonEmpty('Reason'),
}).passthrough();

export const exitInterviewSchema = z.object({
    offboardingId: idString,
}).passthrough();

export const terminateSchema = z.object({
    userId: idString,
}).passthrough();

// ── Worklog ──────────────────────────────────────────────────────────────────
export const createWorkLogSchema = z.object({
    date: nonEmpty('Date'),
    hoursWorked: z.coerce.number().nonnegative(),
}).passthrough();

// ── Timesheet ────────────────────────────────────────────────────────────────
export const saveTimesheetSchema = z.object({
    entries: z.array(z.any()),
}).passthrough();

export const submitTimesheetSchema = z.object({
    id: idString,
}).passthrough();

export const approveTimesheetSchema = z.object({
    id: idString,
    status: z.enum(['APPROVED', 'REJECTED']),
    comment: z.string().optional(),
}).passthrough();

// ── Payroll / Payslip ────────────────────────────────────────────────────────
export const payrollRunSchema = z.object({
    userIds: z.array(idString).min(1, 'At least one user is required'),
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int(),
}).passthrough();

export const uploadPayslipSchema = z.object({
    userId: idString,
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int(),
}).passthrough();

// ── Certificate ──────────────────────────────────────────────────────────────
export const issueCertificateSchema = z.object({
    userId: idString,
    title: nonEmpty('Title'),
    type: nonEmpty('Type'),
}).passthrough();

// ── Holiday ──────────────────────────────────────────────────────────────────
export const createHolidaySchema = z.object({
    name: nonEmpty('Name'),
    date: nonEmpty('Date'),
}).passthrough();

// ── Job role ─────────────────────────────────────────────────────────────────
export const createJobRoleSchema = z.object({
    title: nonEmpty('Title'),
}).passthrough();

// ── Notifications ────────────────────────────────────────────────────────────
export const createNotificationSchema = z.object({
    userId: idString,
    message: nonEmpty('Message'),
}).passthrough();

export const broadcastNotificationSchema = z.object({
    message: nonEmpty('Message'),
}).passthrough();

// ── Company ──────────────────────────────────────────────────────────────────
export const createCompanySchema = z.object({
    name: nonEmpty('Name'),
    adminEmail: z.string().email('A valid admin email is required'),
    adminPassword: z.string().min(6, 'Admin password must be at least 6 characters'),
}).passthrough();

// ── Settings ─────────────────────────────────────────────────────────────────
export const updateSettingsSchema = z.object({
    settings: z.any(),
}).passthrough();

// ── AI ───────────────────────────────────────────────────────────────────────
export const aiChatSchema = z.object({
    message: nonEmpty('Message'),
}).passthrough();

// ── Roles (RBAC v2 role management) ──────────────────────────────────────────
export const createRoleSchema = z.object({
    name: nonEmpty('Role name'),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional(), // validated against the catalog in the controller
}).passthrough();

export const updateRoleSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional(),
}).passthrough();

export const assignRoleSchema = z.object({
    roleId: idString,
}).passthrough();
