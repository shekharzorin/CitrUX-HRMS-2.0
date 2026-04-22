import { api } from './api';

export interface SystemMetrics {
    uptime: number;
    memory: {
        rss: string;
        heapTotal: string;
        heapUsed: string;
    };
    nodeVersion: string;
}

export interface ModuleStatus {
    name: string;
    status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    details?: any;
    lastChecked: string;
}

export interface SystemError {
    id: string;
    module: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    stack?: string;
    timestamp: string;
    resolved: boolean;
}

export interface HealthStatusResponse {
    status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    system: SystemMetrics;
    modules: ModuleStatus[];
}

export const healthService = {
    getStatus: async (): Promise<HealthStatusResponse> => {
        return api.get('/health/status');
    },

    getErrors: async (page = 1, limit = 20) => {
        return api.get(`/health/errors?page=${page}&limit=${limit}`);
    }
};
