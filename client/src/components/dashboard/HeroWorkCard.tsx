import React, { useState, useEffect } from 'react';
import { useAttendanceWidget } from '../../hooks/useAttendanceWidget';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../ui/Icons';

export const HeroWorkCard: React.FC = () => {
    const { user } = useAuth();
    const {
        state,
        actionLoading,
        liveWorkTime,
        punchIn,
        punchOut,
        startBreak,
        endBreak
    } = useAttendanceWidget();

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const isClockedIn = state === 'WORKING' || state === 'ON_BREAK';
    const isOnBreak = state === 'ON_BREAK';

    return (
        <div className="card-premium p-6 md:px-8 border-none bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-full bg-indigo-50/50 dark:bg-indigo-500/5 -skew-x-12 translate-x-32" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-xl">👋</span>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                            {getGreeting()}, {user?.profile?.firstName || 'there'}
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 font-medium ml-8">
                        {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-6 lg:gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</span>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {isOnBreak ? 'On Break' : isClockedIn ? 'Working' : 'Offline'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Time Logged</span>
                        <div className="text-2xl font-bold font-mono tracking-tighter text-slate-900 dark:text-white tabular-nums">
                            {isClockedIn ? liveWorkTime : '00:00:00'}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isClockedIn ? (
                            <button
                                onClick={punchIn}
                                disabled={actionLoading}
                                className="btn btn-primary h-11 px-6 gap-2"
                            >
                                <Icon name="login" size={18} />
                                Clock In
                            </button>
                        ) : (
                            <>
                                {isOnBreak ? (
                                    <button
                                        onClick={endBreak}
                                        disabled={actionLoading}
                                        className="btn btn-secondary h-11 px-6 gap-2"
                                    >
                                        <Icon name="play" size={18} />
                                        Resume
                                    </button>
                                ) : (
                                    <button
                                        onClick={startBreak}
                                        disabled={actionLoading}
                                        className="btn btn-secondary h-11 px-6 gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                                    >
                                        <Icon name="pause" size={18} />
                                        Break
                                    </button>
                                )}
                                <button
                                    onClick={punchOut}
                                    disabled={actionLoading}
                                    className="btn btn-danger h-11 px-6 gap-2"
                                >
                                    <Icon name="logout" size={18} />
                                    Clock Out
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
