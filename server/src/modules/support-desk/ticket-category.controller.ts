import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/auth';
import { TicketCategoryService } from './ticket-category.service';

export const listCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json(await TicketCategoryService.list(req.user!, req.params.deptId));
    } catch (err) { next(err); }
};

export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json(await TicketCategoryService.create(req.user!, req.params.deptId, req.body));
    } catch (err) { next(err); }
};

export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json(await TicketCategoryService.update(req.user!, req.params.id, req.body));
    } catch (err) { next(err); }
};

export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await TicketCategoryService.softDelete(req.user!, req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (err) { next(err); }
};
