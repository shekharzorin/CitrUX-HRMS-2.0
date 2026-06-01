import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createRoleSchema, updateRoleSchema, assignRoleSchema } from '../validators/schemas';
import {
    getPermissionCatalog,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    assignUserRole,
} from '../controllers/role.controller';

const router = Router();

router.use(authenticateToken);

// Permission catalog + role management (gated by MANAGE_ROLES).
router.get('/catalog', requirePermission('MANAGE_ROLES'), getPermissionCatalog);
router.get('/', requirePermission('MANAGE_ROLES'), getRoles);
router.post('/', requirePermission('MANAGE_ROLES'), validate({ body: createRoleSchema }), createRole);

// Assigning a user to a role is a user-management action (+ escalation guard in the controller).
router.put('/assign/:userId', requirePermission('MANAGE_USERS'), validate({ body: assignRoleSchema }), assignUserRole);

router.put('/:id', requirePermission('MANAGE_ROLES'), validate({ body: updateRoleSchema }), updateRole);
router.delete('/:id', requirePermission('MANAGE_ROLES'), deleteRole);

export default router;
