
import { Request, Response } from 'express';
import { HealthService } from '../services/health.service';

export const getSystemStatus = async (req: Request, res: Response) => {
    try {
        const [db, auth, payroll, metrics] = await Promise.all([
            HealthService.checkDatabase(),
            HealthService.checkAuth(),
            HealthService.checkPayroll(),
            HealthService.getSystemMetrics()
        ]);

        const modules = [db, auth, payroll];
        const overallStatus = modules.some(m => m.status === 'DOWN') ? 'DOWN' :
            modules.some(m => m.status === 'DEGRADED') ? 'DEGRADED' : 'HEALTHY';

        res.json({
            status: overallStatus,
            system: metrics,
            modules
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to check system health' });
    }
};

export const getSystemErrors = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await HealthService.getSystemErrors(page, limit);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch system errors' });
    }
};
