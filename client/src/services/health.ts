
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://hrms-6sfe.onrender.com/api');

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
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/health/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch system status');
        return response.json();
    },

    getErrors: async (page = 1, limit = 20) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/health/errors?page=${page}&limit=${limit}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch system errors');
        return response.json();
    }
};
