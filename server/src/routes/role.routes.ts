import { Router } from 'express';
import { authenticateToken, requirePermission, requireAnyPermission } from '../middlewares/auth.middleware';
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

// Listing roles/catalog is allowed for role managers AND user managers (the
// latter need it to assign roles to users from the Edit User screen).
router.get('/catalog', requireAnyPermission(['MANAGE_ROLES', 'MANAGE_USERS']), getPermissionCatalog);
router.get('/', requireAnyPermission(['MANAGE_ROLES', 'MANAGE_USERS']), getRoles);
router.post('/', requirePermission('MANAGE_ROLES'), validate({ body: createRoleSchema }), createRole);

// Assigning a user to a role is a user-management action (+ escalation guard in the controller).
router.put('/assign/:userId', requirePermission('MANAGE_USERS'), validate({ body: assignRoleSchema }), assignUserRole);

router.put('/:id', requirePermission('MANAGE_ROLES'), validate({ body: updateRoleSchema }), updateRole);
router.delete('/:id', requirePermission('MANAGE_ROLES'), deleteRole);

export default router;
