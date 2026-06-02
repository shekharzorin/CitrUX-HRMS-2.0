// Stable auth façade for feature modules. Modules import auth primitives from
// here rather than reaching into middlewares/* directly.
export {
    authenticateToken,
    requirePermission,
    requireAnyPermission,
    authorizeRole,
    requireCompany,
} from '../../middlewares/auth.middleware';
export type { AuthRequest, JwtPayload } from '../../middlewares/auth.middleware';
