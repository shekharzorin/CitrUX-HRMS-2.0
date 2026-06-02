import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/auth';
import { SupportDepartmentService } from './support-department.service';

export const listDepartments = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        res.json(await SupportDepartmentService.listVisible(req.user!, { includeInactive }));
    } catch (err) { next(err); }
};

export const createDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json(await SupportDepartmentService.create(req.user!, req.body));
    } catch (err) { next(err); }
};

export const updateDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json(await SupportDepartmentService.update(req.user!, req.params.id, req.body));
    } catch (err) { next(err); }
};

export const deleteDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await SupportDepartmentService.softDelete(req.user!, req.params.id);
        res.json({ message: 'Queue deleted' });
    } catch (err) { next(err); }
};

export const restoreDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json(await SupportDepartmentService.restore(req.user!, req.params.id));
    } catch (err) { next(err); }
};
