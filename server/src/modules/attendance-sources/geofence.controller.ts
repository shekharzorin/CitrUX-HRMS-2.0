import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/auth';
import { GeofenceService } from './geofence.service';

export const listGeofences = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json(await GeofenceService.list(req.user!)); } catch (err) { next(err); }
};
export const createGeofence = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.status(201).json(await GeofenceService.create(req.user!, req.body)); } catch (err) { next(err); }
};
export const updateGeofence = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json(await GeofenceService.update(req.user!, req.params.id, req.body)); } catch (err) { next(err); }
};
export const deleteGeofence = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json(await GeofenceService.remove(req.user!, req.params.id)); } catch (err) { next(err); }
};
