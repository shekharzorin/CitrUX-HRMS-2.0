import { useState, useEffect } from 'react';

interface BreakRecord {
    id: string;
    startTime: string;
    endTime?: string;
    duration?: number; // duration in minutes usually, or we can calculate it
}

export const useTimer = (checkInTime: string | null | undefined, breaks: BreakRecord[] = []) => {
    const [elapsedTime, setElapsedTime] = useState('00:00:00');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Calculate work duration
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (checkInTime) {
            const calculateDuration = () => {
                const start = new Date(checkInTime).getTime();
                let now = new Date().getTime();

                // Calculate total break time in milliseconds
                let totalBreakTimeMs = 0;
                let isOnBreak = false;

                breaks.forEach(b => {
                    const breakStart = new Date(b.startTime).getTime();
                    if (b.endTime) {
                        const breakEnd = new Date(b.endTime).getTime();
                        totalBreakTimeMs += (breakEnd - breakStart);
                    } else {
                        // Currently on break
                        isOnBreak = true;
                        // Time since break started is not counted towards work duration
                        totalBreakTimeMs += (now - breakStart);
                    }
                });

                const activeDiff = Math.max(0, now - start - totalBreakTimeMs);

                const hours = Math.floor(activeDiff / (1000 * 60 * 60));
                const minutes = Math.floor((activeDiff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((activeDiff % (1000 * 60)) / 1000);

                setElapsedTime(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            };

            calculateDuration(); // initial call
            interval = setInterval(calculateDuration, 1000);
        } else {
            setElapsedTime('00:00:00');
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [checkInTime, breaks]);

    return { elapsedTime, currentTime };
};
