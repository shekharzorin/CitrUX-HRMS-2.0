import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/auth';
import { AppError } from '../../middlewares/error.middleware';
import { AttendanceIngestionService } from './attendance-ingestion.service';

export const getCheckinOptions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json(await AttendanceIngestionService.getCheckinOptions(req.user!)); } catch (err) { next(err); }
};

export const gpsCheckin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const file = (req as any).file;
        res.status(201).json(await AttendanceIngestionService.gpsCheckIn(req.user!, {
            eventType: req.body.eventType,
            lat: Number(req.body.lat),
            lng: Number(req.body.lng),
            accuracy: req.body.accuracy != null && req.body.accuracy !== '' ? Number(req.body.accuracy) : undefined,
            selfieFile: file ? { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, size: file.size } : undefined,
        }));
    } catch (err) { next(err); }
};

export const listEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json(await AttendanceIngestionService.listEvents(req.user!, {
            userId: req.query.userId as string | undefined,
            from: req.query.from as string | undefined,
            to: req.query.to as string | undefined,
        }));
    } catch (err) { next(err); }
};

export const recordManual = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const body = { ...req.body, checkOut: req.body.checkOut || undefined };
        res.status(201).json(await AttendanceIngestionService.recordManual(req.user!, body));
    } catch (err) { next(err); }
};

export const previewCsv = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const file = (req as any).file;
        if (!file) throw new AppError('CSV file is required', 400);
        if (!req.body.sourceId) throw new AppError('sourceId is required', 400);
        res.json(await AttendanceIngestionService.previewCsv(req.user!, req.body.sourceId, file.buffer));
    } catch (err) { next(err); }
};

export const importCsv = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const file = (req as any).file;
        if (!file) throw new AppError('CSV file is required', 400);
        if (!req.body.sourceId) throw new AppError('sourceId is required', 400);
        res.json(await AttendanceIngestionService.importCsv(req.user!, req.body.sourceId, file.buffer));
    } catch (err) { next(err); }
};
