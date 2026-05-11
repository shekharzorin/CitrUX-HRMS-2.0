import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDashboardStats, type DashboardStats } from '../services/dashboard.service';

const POLL_INTERVAL_MS = 120_000; // Re-fetch every 2 minutes (live feel without websocket)

export interface UseDashboardReturn {
    stats: DashboardStats | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    lastUpdated: Date | null;
}

export function useDashboard(): UseDashboardReturn {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const load = useCallback(async (force = false) => {
        try {
            setError(null);
            const data = await fetchDashboardStats(force);
            setStats(data);
            setLastUpdated(new Date());
        } catch (err: any) {
            setError(err?.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        await load(true);
    }, [load]);

    // Initial load + polling
    useEffect(() => {
        load();

        pollRef.current = setInterval(() => {
            load(true); // bypass cache for background refresh
        }, POLL_INTERVAL_MS);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [load]);

    return { stats, loading, error, refresh, lastUpdated };
}
