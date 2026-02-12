
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const prisma = new PrismaClient();

export interface ModuleStatus {
    name: string;
    status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    details?: any;
    lastChecked: Date;
}

export class HealthService {

    static async checkDatabase(): Promise<ModuleStatus> {
        try {
            const start = Date.now();
            await prisma.$queryRaw`SELECT 1`;
            const duration = Date.now() - start;
            return {
                name: 'Database',
                status: duration > 1000 ? 'DEGRADED' : 'HEALTHY',
                details: { latency: `${duration}ms` },
                lastChecked: new Date()
            };
        } catch (error: any) {
            return {
                name: 'Database',
                status: 'DOWN',
                details: { error: error.message },
                lastChecked: new Date()
            };
        }
    }

    static async checkPayroll(): Promise<ModuleStatus> {
        try {
            // Check if SalaryStructures exist (simple integrity check)
            const count = await prisma.salaryStructure.count();
            return {
                name: 'Payroll',
                status: 'HEALTHY',
                details: { salaryStructures: count },
                lastChecked: new Date()
            };
        } catch (error: any) {
            return {
                name: 'Payroll',
                status: 'DOWN',
                details: { error: error.message },
                lastChecked: new Date()
            };
        }
    }

    static async checkAuth(): Promise<ModuleStatus> {
        try {
            // Check if we can count users
            const count = await prisma.user.count();
            return {
                name: 'Authentication',
                status: 'HEALTHY',
                details: { users: count },
                lastChecked: new Date()
            };
        } catch (error: any) {
            return {
                name: 'Authentication',
                status: 'DOWN',
                details: { error: error.message },
                lastChecked: new Date()
            };
        }
    }

    static async getSystemMetrics(): Promise<any> {
        const memoryUsage = process.memoryUsage();
        return {
            uptime: process.uptime(),
            memory: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
            },
            nodeVersion: process.version
        };
    }

    static async getSystemErrors(page = 1, limit = 20) {
        // @ts-ignore - SystemError not yet generated in client
        if (!prisma.systemError) return { errors: [], total: 0 };

        // @ts-ignore
        const errors = await prisma.systemError.findMany({
            take: limit,
            skip: (page - 1) * limit,
            orderBy: { timestamp: 'desc' }
        });

        // @ts-ignore
        const total = await prisma.systemError.count();

        return { errors, total, page, totalPages: Math.ceil(total / limit) };
    }

    static async logError(module: string, message: string, severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'DOES NOT EXIST' as any, stack?: string) {
        try {
            // @ts-ignore
            if (prisma.systemError) {
                // @ts-ignore
                await prisma.systemError.create({
                    data: {
                        module,
                        message,
                        severity: severity === 'DOES NOT EXIST' ? 'INFO' : severity,
                        stack,
                        timestamp: new Date()
                    }
                });
            }
        } catch (e) {
            console.error("Failed to log system error:", e);
        }
    }
}
