import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export const useAttendanceWidget = () => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [clockedIn, setClockedIn] = useState(false);
    const [onBreak, setOnBreak] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [workDuration, setWorkDuration] = useState<string>('00:00:00');
    const [clockingLoading, setClockingLoading] = useState(false);

    // New States for Keka Style
    const [shiftProgress, setShiftProgress] = useState(0);
    const [shiftDetails, setShiftDetails] = useState<{ start: string; end: string; name: string } | null>(null);
    const [location] = useState('Office'); // Default or user preference
    const [status, setStatus] = useState<'ontime' | 'late' | 'none'>('none');

    const getLocalToday = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const calculateShiftProgress = () => {
        if (!user?.shift) return 0;

        // Parse "HH:mm"
        const [startH, startM] = user.shift.startTime.split(':').map(Number);
        const [endH, endM] = user.shift.endTime.split(':').map(Number);

        const now = new Date();
        const start = new Date(); start.setHours(startH, startM, 0, 0);
        const end = new Date(); end.setHours(endH, endM, 0, 0);

        const totalMs = end.getTime() - start.getTime();
        const elapsedMs = now.getTime() - start.getTime();

        if (elapsedMs < 0) return 0;
        if (elapsedMs > totalMs) return 100;

        return Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
    };

    const fetchAttendanceStatus = async () => {
        try {
            const currentData = await api.get<any[]>('/attendance/my-history');
            if (currentData && currentData.length > 0) {
                // Backend sorts by date desc, so the first record is the latest
                const latest = currentData[0];

                // Check if the latest record is an active session (no check-out)
                // We trust the latest record regardless of date to handle cross-midnight or timezone shifts correctly
                if (latest && latest.checkIn && !latest.checkOut) {
                    setClockedIn(true);
                    setStartTime(new Date(latest.checkIn));

                    const activeBreak = latest.breaks?.find((b: any) => !b.endTime);
                    setOnBreak(!!activeBreak);
                    setStatus(latest.isLate ? 'late' : 'ontime');
                } else {
                    setClockedIn(false);
                    setOnBreak(false);
                    setStartTime(null);
                    setWorkDuration('00:00:00');
                    setStatus('none');
                }
            }
        } catch (error) {
            console.error("Attendance check failed", error);
        }
    };

    const handleClockIn = async () => {
        if (clockingLoading) return;
        setClockingLoading(true);
        try {
            const workDate = getLocalToday();
            const res = await api.post<any>('/attendance/punch-in', { location, workDate });
            setClockedIn(true);
            const punchTime = res.checkIn ? new Date(res.checkIn) : new Date();
            setStartTime(punchTime);
            setStatus(res.isLate ? 'late' : 'ontime');
            showToast("Clocked In Successfully", "success");
            fetchAttendanceStatus();
        } catch (error: any) {
            showToast(error.message || "Error clocking in", "error");
        } finally {
            setClockingLoading(false);
        }
    };

    const handleClockOut = async () => {
        if (clockingLoading) return;
        setClockingLoading(true);
        try {
            await api.post('/attendance/punch-out', { location });
            setClockedIn(false);
            setOnBreak(false);
            setStartTime(null);
            setWorkDuration('00:00:00');
            setStatus('none');
            showToast("Clocked Out Successfully", "success");
            fetchAttendanceStatus();
        } catch (error: any) {
            showToast(error.message || "Error clocking out", "error");
        } finally {
            setClockingLoading(false);
        }
    };

    const handleStartBreak = async () => {
        if (clockingLoading) return;
        setClockingLoading(true);
        try {
            await api.post('/attendance/break/start', {});
            setOnBreak(true);
            showToast("Break Started", "info");
            fetchAttendanceStatus();
        } catch (error: any) {
            showToast(error.message || "Error starting break", "error");
        } finally {
            setClockingLoading(false);
        }
    };

    const handleEndBreak = async () => {
        if (clockingLoading) return;
        setClockingLoading(true);
        try {
            await api.post('/attendance/break/end', {});
            setOnBreak(false);
            showToast("Break Ended", "success");
            fetchAttendanceStatus();
        } catch (error: any) {
            showToast(error.message || "Error ending break", "error");
        } finally {
            setClockingLoading(false);
        }
    };

    // Initialize & Live Timer
    useEffect(() => {
        if (user?.shift) {
            setShiftDetails({
                start: user.shift.startTime,
                end: user.shift.endTime,
                name: user.shift.name
            });
        }

        fetchAttendanceStatus();

        const timer = setInterval(() => {
            // Update Work Duration
            if (clockedIn && startTime) {
                const now = new Date();
                const diff = now.getTime() - new Date(startTime).getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setWorkDuration(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            }

            // Update Progress
            setShiftProgress(calculateShiftProgress());
        }, 1000);

        return () => clearInterval(timer);
    }, [user, clockedIn, startTime]); // Re-run if user/shift changes

    return {
        clockedIn,
        onBreak,
        startTime,
        workDuration,
        clockingLoading,
        handleClockIn,
        handleClockOut,
        handleStartBreak,
        handleEndBreak,
        shiftDetails,
        shiftProgress,
        status,
        refreshAttendance: fetchAttendanceStatus
    };
};
