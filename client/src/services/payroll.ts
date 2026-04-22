import { api } from './api';

export interface PayrollStats {
    totalEmployees: number;
    processedCount: number;
    pendingCount: number;
    totalCost: number;
}

export interface PayrollCalculation {
    user: any;
    calculation: {
        attendance: { workingDays: number; presentDays: number; lopDays: number };
        earnings: { gross: number };
        deductions: { totalDeductions: number; lopAmount: number };
        netPay: number;
    };
}

export const payrollService = {
    getStats: async (month: number, year: number) => {
        return api.get(`/payroll/stats?month=${month}&year=${year}`);
    },

    calculate: async (userIds: string[], month: number, year: number) => {
        return api.post('/payroll/calculate', { userIds, month, year });
    },

    generate: async (userIds: string[], month: number, year: number) => {
        return api.post('/payroll/generate', { userIds, month, year });
    },

    list: async (month: number, year: number) => {
        return api.get(`/payroll/list?month=${month}&year=${year}`);
    },

    getDownloadUrl: (id: string) => {
        const token = localStorage.getItem('token');
        // We use a raw URL for downloads since it's usually a link
        const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://citrux-hrms-api.onrender.com/api');
        return `${API_URL}/payroll/${id}/download?token=${token}`;
    }
};
