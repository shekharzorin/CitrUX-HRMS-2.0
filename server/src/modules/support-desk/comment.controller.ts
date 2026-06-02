import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/auth';
import { TicketCommentService } from './comment.service';

export const listComments = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json(await TicketCommentService.list(req.user!, req.params.id));
    } catch (err) { next(err); }
};

export const createComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const files = ((req as any).files as any[] | undefined) ?? [];
        res.status(201).json(await TicketCommentService.create(req.user!, req.params.id, req.body, files));
    } catch (err) { next(err); }
};
