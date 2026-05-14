import React, { useState, useEffect, useRef } from 'react';
import { useAttendanceWidget } from '../../hooks/useAttendanceWidget';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../ui/Icons';

export const HeroWorkCard: React.FC = () => {
    const { user } = useAuth();
    const {
        state,
        activeRecord,
        actionLoading,
        liveWorkTime,
        punchIn,
        punchOut,
        startBreak,
        endBreak
    } = useAttendanceWidget();

    const [currentTime, setCurrentTime] = useState(new Date());
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Sync Progress Bar Imperatively to avoid inline style warnings
    useEffect(() => {
        if (progressRef.current) {
            const workHours = activeRecord?.hours || 0;
            const progress = Math.min(100, (workHours / 8) * 100);
            progressRef.current.style.width = `${progress}%`;
        }
    }, [activeRecord?.hours]);

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const isClockedIn = state === 'WORKING' || state === 'ON_BREAK';
    const isOnBreak = state === 'ON_BREAK';

    const getStatusText = () => {
        if (state === 'IDLE') return 'Not Clocked In';
        if (state === 'CLOCKED_OUT') return 'Clocked Out';
        if (state === 'ON_BREAK') return 'On Break';
        return 'Working';
    };

    const getStatusColor = () => {
        if (state === 'IDLE' || state === 'CLOCKED_OUT') return 'bg-slate-500';
        if (state === 'ON_BREAK') return 'bg-amber-500';
        return 'bg-emerald-500';
    };


    return (
        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 text-white p-8 md:p-10 shadow-2xl shadow-slate-200 dark:shadow-none animate-scale-up">
            {/* Background Pattern/Glow */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/30 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Greeting & Time */}
                <div className="lg:col-span-4 space-y-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-100">
                            {getGreeting()}, {user?.profile?.firstName || 'there'} 👋
                        </h1>
                        <p className="text-slate-200 font-medium mt-1">
                            {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="space-y-1">
                             <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Current Time</p>
                            <p className="text-3xl font-black font-mono tracking-tighter tabular-nums">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </p>
                        </div>
                        <div className="h-10 w-[1px] bg-slate-800"></div>
                        <div className="space-y-1">
                             <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Shift Timing</p>
                            <p className="text-sm font-bold text-slate-300">
                                {user?.shift ? `${user.shift.startTime} - ${user.shift.endTime}` : 'General Shift'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status & Timer */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} ${isClockedIn && !isOnBreak && 'animate-pulse'}`}></span>
                         <span className="text-xs font-bold uppercase tracking-widest text-white">{getStatusText()}</span>
                    </div>
                    
                    <div className="text-5xl font-black font-mono tracking-tighter tabular-nums text-white">
                        {isClockedIn ? liveWorkTime : '00:00:00'}
                    </div>
                     <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mt-2">Today's Work Duration</p>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-white/10 rounded-full mt-6 overflow-hidden">
                        <div 
                            ref={progressRef}
                            className={`h-full transition-all duration-1000 ${isOnBreak ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        ></div>
                    </div>
                </div>

                {/* Primary CTA */}
                <div className="lg:col-span-4 flex flex-col gap-3">
                    {state === 'IDLE' || state === 'CLOCKED_OUT' ? (
                        <button
                            onClick={punchIn}
                            disabled={actionLoading}
                            className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <Icon name="login" size={24} />
                            Clock In Now
                        </button>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                {isOnBreak ? (
                                    <button
                                        onClick={endBreak}
                                        disabled={actionLoading}
                                        className="py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                    >
                                        <Icon name="play" size={20} />
                                        Resume
                                    </button>
                                ) : (
                                    <button
                                        onClick={startBreak}
                                        disabled={actionLoading}
                                        className="py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                                    >
                                        <Icon name="pause" size={20} />
                                        Break
                                    </button>
                                )}
                                <button
                                    onClick={punchOut}
                                    disabled={actionLoading}
                                    className="py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
                                >
                                    <Icon name="logout" size={20} />
                                    Clock Out
                                </button>
                            </div>
                             <p className="text-[10px] text-center text-slate-300 font-medium">
                                {activeRecord?.checkIn && `Started at ${new Date(activeRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
