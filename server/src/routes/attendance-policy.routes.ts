import { Router } from 'express';
import { authenticateToken, authorizeRole, requireCompany } from '../middlewares/auth.middleware';
import {
    getPolicy,
    upsertPolicy,
    getEffectivePolicyForUser,
    getEffectivePolicyForCompanyHandler,
    getPlatformDefaults,
    getShiftOverride,
    upsertShiftOverride,
    deleteShiftOverride,
    getUserOverride,
    upsertUserOverride,
    deleteUserOverride,
} from '../controllers/attendance-policy.controller';

const router = Router();

const adminOrHR  = authorizeRole(['ADMIN', 'HR', 'SUPER_ADMIN']);
const adminOnly  = authorizeRole(['ADMIN', 'SUPER_ADMIN']);
const allRoles   = authenticateToken;

// ─── Company Policy ───────────────────────────────────────────────────────────
router.get('/',                      allRoles, requireCompany, adminOrHR,  getPolicy);
router.put('/',                      allRoles, requireCompany, adminOnly,  upsertPolicy);
router.get('/defaults',              allRoles,                             getPlatformDefaults);
router.get('/effective',             allRoles,                             getEffectivePolicyForUser);
router.get('/effective-company',     allRoles, requireCompany, adminOrHR,  getEffectivePolicyForCompanyHandler);

// ─── Shift Overrides ──────────────────────────────────────────────────────────
router.get('/shifts/:shiftId/override',    allRoles, requireCompany, adminOrHR, getShiftOverride);
router.put('/shifts/:shiftId/override',    allRoles, requireCompany, adminOnly, upsertShiftOverride);
router.delete('/shifts/:shiftId/override', allRoles, requireCompany, adminOnly, deleteShiftOverride);

// ─── User Overrides ───────────────────────────────────────────────────────────
router.get('/users/:userId/override',    allRoles, requireCompany, adminOrHR, getUserOverride);
router.put('/users/:userId/override',    allRoles, requireCompany, adminOnly, upsertUserOverride);
router.delete('/users/:userId/override', allRoles, requireCompany, adminOnly, deleteUserOverride);

export default router;
