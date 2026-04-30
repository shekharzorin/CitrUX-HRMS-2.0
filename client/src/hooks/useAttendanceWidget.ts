import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export type AttendanceState = 'IDLE' | 'WORKING' | 'ON_BREAK' | 'CLOCKED_OUT';

export const useAttendanceWidget = () => {
    useAuth();
    const { showToast } = useToast();

    // Core States
    const [state, setState] = useState<AttendanceState>('IDLE');
    const [activeRecord, setActiveRecord] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Live Metrics
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [totalWorkSeconds, setTotalWorkSeconds] = useState(0);
    const [breakSeconds, setBreakSeconds] = useState(0);

    const getLocalToday = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const fetchStatus = useCallback(async () => {
        try {
            const history = await api.get<any[]>('/attendance/my-history', { silent: true });
            const today = getLocalToday();
            
            // Filter records for today to sum up total work
            const todayRecords = history.filter(r => r.date.startsWith(today));
            const latest = todayRecords[0]; // Most recent first

            if (latest) {
                setActiveRecord(latest);
                
                if (latest.checkOut) {
                    setState('CLOCKED_OUT');
                } else {
                    const activeBreak = latest.breaks?.find((b: any) => !b.endTime);
                    setState(activeBreak ? 'ON_BREAK' : 'WORKING');
                }
            } else {
                setState('IDLE');
                setActiveRecord(null);
            }

            // Initial calculation of seconds
            calculateMetrics(todayRecords);
        } catch (error) {
            console.error("Failed to sync attendance", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const calculateMetrics = (records: any[]) => {
        let workSec = 0;
        let breakSec = 0;

        records.forEach(r => {
            // Completed work time (excluding active session)
            if (r.checkIn && r.checkOut) {
                const diff = (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 1000;
                workSec += diff;
            }

            // Break time
            r.breaks?.forEach((b: any) => {
                if (b.startTime && b.endTime) {
                    breakSec += (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 1000;
                }
            });
        });

        setTotalWorkSeconds(workSec);
        setBreakSeconds(breakSec);
    };

    // Actions
    const punchIn = async () => {
        setActionLoading(true);
        try {
            await api.post('/attendance/punch-in', { location: 'Office', workDate: getLocalToday() });
            showToast("Clocked in successfully", "success");
            await fetchStatus();
        } catch (e: any) { showToast(e.message || "Clock in failed", "error"); }
        finally { setActionLoading(false); }
    };

    const punchOut = async () => {
        setActionLoading(true);
        try {
            await api.post('/attendance/punch-out', {});
            showToast("Clocked out successfully", "success");
            await fetchStatus();
        } catch (e: any) { showToast(e.message || "Clock out failed", "error"); }
        finally { setActionLoading(false); }
    };

    const startBreak = async () => {
        setActionLoading(true);
        try {
            await api.post('/attendance/break/start', {});
            showToast("Break started", "info");
            await fetchStatus();
        } catch (e: any) { showToast(e.message || "Failed to start break", "error"); }
        finally { setActionLoading(false); }
    };

    const endBreak = async () => {
        setActionLoading(true);
        try {
            await api.post('/attendance/break/end', {});
            showToast("Break resumed", "success");
            await fetchStatus();
        } catch (e: any) { showToast(e.message || "Failed to resume", "error"); }
        finally { setActionLoading(false); }
    };

    // Formatting helpers
    const formatDuration = (totalSec: number) => {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = Math.floor(totalSec % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Live Engine
    useEffect(() => {
        fetchStatus();
        const interval = setInterval(() => {
            if (state === 'WORKING' && activeRecord?.checkIn) {
                const now = new Date().getTime();
                const start = new Date(activeRecord.checkIn).getTime();
                setElapsedSeconds(Math.floor((now - start) / 1000));
            } else if (state === 'ON_BREAK') {
                const activeBreak = activeRecord.breaks?.find((b: any) => !b.endTime);
                if (activeBreak) {
                    const now = new Date().getTime();
                    const start = new Date(activeBreak.startTime).getTime();
                    setElapsedSeconds(Math.floor((now - start) / 1000));
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [fetchStatus]); // Only depend on fetchStatus (which is memoized)

    // Computed Values
    const liveWorkTime = useMemo(() => {
        if (state === 'WORKING' && activeRecord?.checkIn) {
            const currentSession = (new Date().getTime() - new Date(activeRecord.checkIn).getTime()) / 1000;
            return formatDuration(totalWorkSeconds + currentSession);
        }
        return formatDuration(totalWorkSeconds);
    }, [state, activeRecord, totalWorkSeconds]);

    const liveBreakTime = useMemo(() => {
        if (state === 'ON_BREAK') {
            const activeBreak = activeRecord?.breaks?.find((b: any) => !b.endTime);
            if (activeBreak) {
                const currentBreak = (new Date().getTime() - new Date(activeBreak.startTime).getTime()) / 1000;
                return formatDuration(breakSeconds + currentBreak);
            }
        }
        return formatDuration(breakSeconds);
    }, [state, activeRecord, breakSeconds]);

    return {
        state,
        activeRecord,
        loading,
        actionLoading,
        elapsedSeconds,
        liveWorkTime,
        liveBreakTime,
        punchIn,
        punchOut,
        startBreak,
        endBreak,
        refresh: fetchStatus,
        formatDuration
    };
};
