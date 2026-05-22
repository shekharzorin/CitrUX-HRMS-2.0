import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PermissionService, Permission, Role } from '../services/permission.service';

export interface JwtPayload {
    userId: string;
    role: string;
    companyId: string | null;
}

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'] as string | undefined;
    const token = (authHeader && authHeader.split(' ')[1]) || (req.query.token as string);

    if (!token) return res.status(401).json({ message: 'Access Denied' });

    jwt.verify(token, process.env.JWT_SECRET as string, (err: any, decoded: any) => {
        if (err) return res.status(401).json({ message: 'Invalid or expired token' });
        req.user = decoded as JwtPayload;
        next();
    });
};

export const authorizeRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
        }
        const userRole = req.user.role.toUpperCase();
        if (userRole === 'SUPER_ADMIN' || roles.map(r => r.toUpperCase()).includes(userRole)) {
            return next();
        }
        return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    };
};

export const optionalAuthenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'] as string | undefined;
    const token = (authHeader && authHeader.split(' ')[1]) || (req.query.token as string);

    if (!token) return next();

    jwt.verify(token, process.env.JWT_SECRET as string, (err: any, decoded: any) => {
        if (!err) {
            req.user = decoded as JwtPayload;
        }
        next();
    });
};

/**
 * Blocks requests where the user has no companyId (i.e. blocks SUPER_ADMIN
 * from hitting company-specific endpoints they've not scoped to a company).
 */
export const requireCompany = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.companyId) {
        return res.status(403).json({ message: 'Company context required for this endpoint' });
    }
    next();
};

export const requirePermission = (permission: Permission) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Access Denied' });
        }
        
        const hasAccess = PermissionService.hasPermission(req.user.role as Role, permission);
        
        if (!hasAccess) {
            return res.status(403).json({ message: `Forbidden: requires ${permission} permission` });
        }
        next();
    };
};
