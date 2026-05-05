import { api } from './api';

// ── Typed Interfaces ──────────────────────────────────────────────────────────

export interface DashboardStats {
    users?: { total: number; active: number };
    attendance?: { presentToday: number; lateToday?: number };
    recruitment?: { openJobs: number };
    finance?: { pendingClaims: number };
    departments?: { name: string; count: number }[];
    whoIsOut?: { name: string; role: string; status: string }[];
    birthdays?: { name: string; date: string; photo?: string }[];
    attendanceTrend?: AttendanceTrendPoint[];
    leaveTrend?: LeaveTrendPoint[];
    pendingActions?: {
        leaves: PendingLeave[];
        expenses: PendingExpense[];
    };
    teamMembers?: TeamMember[];
    personalStats?: {
        daysThisMonth: number;
        hoursThisMonth: number;
        lateDays: number;
    };
}

export interface AttendanceTrendPoint {
    day: string;
    date: string;
    present: number;
}

export interface LeaveTrendPoint {
    month: string;
    approved: number;
    pending: number;
}

export interface PendingLeave {
    id: string;
    userName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string;
}

export interface PendingExpense {
    id: string;
    userName: string;
    description: string;
    amount: number;
}

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    designation: string;
    employeeId?: string;
    photo?: string;
}

// ── Today's attendance summary (for AdminHR-level) ────────────────────────────
export interface TodaySummary {
    present: number;
    absent: number;
    onLeave: number;
    late: number;
    total: number;
}

// ── Fetch dashboard data from the existing /stats endpoint ───────────────────

let cachedStats: DashboardStats | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute client-side cache

export async function fetchDashboardStats(force = false): Promise<DashboardStats> {
    const now = Date.now();
    if (!force && cachedStats && now - cacheTimestamp < CACHE_TTL_MS) {
        return cachedStats;
    }
    const data = await api.get<DashboardStats>('/stats', { silent: true });
    cachedStats = data;
    cacheTimestamp = now;
    return data;
}

export function invalidateDashboardCache() {
    cachedStats = null;
    cacheTimestamp = 0;
}

// ── Today's detailed attendance summary built from stats response ─────────────
export function buildTodaySummary(stats: DashboardStats): TodaySummary {
    const present = stats.attendance?.presentToday ?? 0;
    const late = stats.attendance?.lateToday ?? 0;
    const total = stats.users?.active ?? stats.users?.total ?? 0;
    const onLeave = stats.whoIsOut?.length ?? 0;
    const absent = Math.max(0, total - present - onLeave);
    return { present, absent, onLeave, late, total };
}

// ── Priority label: > 2 days pending = URGENT, else PENDING ─────────────────
export function getPriority(startDate: string): 'URGENT' | 'PENDING' {
    const diffDays = (Date.now() - new Date(startDate).getTime()) / 86_400_000;
    return diffDays >= 2 ? 'URGENT' : 'PENDING';
}

// ── Attendance approval actions (for ActionList quick-approve) ────────────────
export async function approveLeave(id: string): Promise<void> {
    await api.put(`/leaves/${id}/status`, { status: 'APPROVED' });
    invalidateDashboardCache();
}

export async function rejectLeave(id: string): Promise<void> {
    await api.put(`/leaves/${id}/status`, { status: 'REJECTED' });
    invalidateDashboardCache();
}

export async function approveExpense(id: string): Promise<void> {
    await api.put(`/expenses/claims/${id}/status`, { status: 'APPROVED' });
    invalidateDashboardCache();
}

export async function rejectExpense(id: string): Promise<void> {
    await api.put(`/expenses/claims/${id}/status`, { status: 'REJECTED' });
    invalidateDashboardCache();
}
