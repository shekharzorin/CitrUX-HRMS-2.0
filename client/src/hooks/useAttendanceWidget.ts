import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';

export const useAttendanceWidget = () => {
    const [clockedIn, setClockedIn] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [workDuration, setWorkDuration] = useState<string>('00:00:00');
    const [clockingLoading, setClockingLoading] = useState(false);
    const { showToast } = useToast();

    // Helper for local YYYY-MM-DD
    const getLocalToday = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const fetchAttendanceStatus = async () => {
        try {
            const currentData = await api.get<any[]>('/attendance');
            if (currentData && currentData.length > 0) {
                // Check if latest record is from today and has no checkout
                const latest = currentData[0]; // Ordered by date desc
                const todayStr = new Date().toDateString();
                const recordDate = new Date(latest.date).toDateString();

                if (recordDate === todayStr && latest.checkIn && !latest.checkOut) {
                    setClockedIn(true);
                    setStartTime(new Date(latest.checkIn));
                } else {
                    // Ensure state is reset if not clocked in today (e.g. new day started)
                    setClockedIn(false);
                    setStartTime(null);
                    setWorkDuration('00:00:00');
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
            if (clockedIn) {
                // Clock Out logic
                await api.post('/attendance/punch-out', { location: 'Office' });
                setClockedIn(false);
                setStartTime(null);
                setWorkDuration('00:00:00');
                showToast("Clocked Out Successfully", "success");
            } else {
                // Clock In logic
                const workDate = getLocalToday();
                const res = await api.post<any>('/attendance/punch-in', { location: 'Office', workDate });

                setClockedIn(true);
                // Use server time if available, else local
                const punchTime = res.checkIn ? new Date(res.checkIn) : new Date();
                setStartTime(punchTime);
                showToast("Clocked In Successfully", "success");
            }
            // Refresh logic to double check
            fetchAttendanceStatus();
        } catch (error: any) {
            console.error("Clock In/Out Error", error);
            showToast(error.message || "Error updating attendance", "error");
        } finally {
            setClockingLoading(false);
        }
    };

    // Live Work Timer
    useEffect(() => {
        let interval: any;
        if (clockedIn && startTime) {
            interval = setInterval(() => {
                const now = new Date();
                const diff = now.getTime() - new Date(startTime).getTime();

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                setWorkDuration(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            }, 1000);
        } else {
            setWorkDuration('00:00:00');
        }
        return () => clearInterval(interval);
    }, [clockedIn, startTime]);

    // Initial check
    useEffect(() => {
        fetchAttendanceStatus();
    }, []);

    return {
        clockedIn,
        startTime,
        workDuration,
        clockingLoading,
        handleClockIn,
        refreshAttendance: fetchAttendanceStatus
    };
};
