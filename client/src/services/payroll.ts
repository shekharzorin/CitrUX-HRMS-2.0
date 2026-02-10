
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://hrms-6sfe.onrender.com/api');

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
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/payroll/stats?month=${month}&year=${year}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },

    calculate: async (userIds: string[], month: number, year: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/payroll/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userIds, month, year })
        });
        return response.json();
    },

    generate: async (userIds: string[], month: number, year: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/payroll/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userIds, month, year })
        });
        return response.json();
    },

    list: async (month: number, year: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/payroll/list?month=${month}&year=${year}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },

    getDownloadUrl: (id: string) => {
        const token = localStorage.getItem('token');
        return `${API_URL}/payroll/${id}/download?token=${token}`;
    }
};
