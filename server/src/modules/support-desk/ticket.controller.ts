import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/auth';
import { TicketService } from './ticket.service';

export const createTicket = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const files = ((req as any).files as any[] | undefined) ?? [];
        res.status(201).json(await TicketService.create(req.user!, req.body, files));
    } catch (err) { next(err); }
};

export const listTickets = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json(await TicketService.list(req.user!, {
            status: req.query.status as string | undefined,
            supportDepartmentId: req.query.supportDepartmentId as string | undefined,
        }));
    } catch (err) { next(err); }
};

export const getTicket = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json(await TicketService.getById(req.user!, req.params.id));
    } catch (err) { next(err); }
};
