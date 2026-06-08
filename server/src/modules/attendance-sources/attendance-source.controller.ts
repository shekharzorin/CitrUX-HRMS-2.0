import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/auth';
import { AttendanceSourceService } from './attendance-source.service';

export const getCapabilities = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json(AttendanceSourceService.capabilities()); } catch (err) { next(err); }
};

export const listSources = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json(await AttendanceSourceService.list(req.user!)); } catch (err) { next(err); }
};

export const createSource = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.status(201).json(await AttendanceSourceService.create(req.user!, req.body)); } catch (err) { next(err); }
};

export const updateSource = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json(await AttendanceSourceService.update(req.user!, req.params.id, req.body)); } catch (err) { next(err); }
};

export const deleteSource = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json(await AttendanceSourceService.remove(req.user!, req.params.id)); } catch (err) { next(err); }
};
