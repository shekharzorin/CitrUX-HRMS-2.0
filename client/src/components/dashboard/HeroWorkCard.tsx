import React, { useState, useEffect } from 'react';
import { useAttendanceWidget } from '../../hooks/useAttendanceWidget';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../ui/Icons';

export const HeroWorkCard: React.FC = () => {
    const { user } = useAuth();
    const {
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
        shiftProgress
    } = useAttendanceWidget();

    const [currentTime, setCurrentTime] = useState(new Date());
    const progressRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (progressRef.current) {
            progressRef.current.style.width = `${shiftProgress}%`;
        }
    }, [shiftProgress]);

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

    const getStatusText = () => {
        if (!clockedIn) return 'Not Clocked In';
        if (onBreak) return 'On Break';
        return 'Working';
    };

    const getStatusColor = () => {
        if (!clockedIn) return 'bg-slate-500';
        if (onBreak) return 'bg-amber-500';
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
                        <p className="text-slate-400 font-medium mt-1">
                            {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Time</p>
                            <p className="text-3xl font-black font-mono tracking-tighter">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </p>
                        </div>
                        <div className="h-10 w-[1px] bg-slate-800"></div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Shift Timing</p>
                            <p className="text-sm font-bold text-slate-300">
                                {shiftDetails ? `${shiftDetails.start} - ${shiftDetails.end}` : 'General Shift'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status & Timer */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} ${clockedIn && !onBreak && 'animate-pulse'}`}></span>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-300">{getStatusText()}</span>
                    </div>
                    
                    <div className="text-5xl font-black font-mono tracking-tighter tabular-nums text-white">
                        {clockedIn ? workDuration : '00:00:00'}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">Work Duration</p>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-white/10 rounded-full mt-6 overflow-hidden">
                        <div 
                            ref={progressRef}
                            className={`h-full transition-all duration-1000 ${onBreak ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        ></div>
                    </div>
                </div>

                {/* Primary CTA */}
                <div className="lg:col-span-4 flex flex-col gap-3">
                    {!clockedIn ? (
                        <button
                            onClick={handleClockIn}
                            disabled={clockingLoading}
                            className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <Icon name="login" size={24} />
                            Clock In Now
                        </button>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                {onBreak ? (
                                    <button
                                        onClick={handleEndBreak}
                                        disabled={clockingLoading}
                                        className="py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                    >
                                        <Icon name="play" size={20} />
                                        Resume
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleStartBreak}
                                        disabled={clockingLoading}
                                        className="py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                                    >
                                        <Icon name="pause" size={20} />
                                        Break
                                    </button>
                                )}
                                <button
                                    onClick={handleClockOut}
                                    disabled={clockingLoading || onBreak}
                                    className="py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 disabled:opacity-50"
                                >
                                    <Icon name="logout" size={20} />
                                    Clock Out
                                </button>
                            </div>
                            <p className="text-[10px] text-center text-slate-500 font-medium">
                                Last activity: {clockedIn && startTime ? 'Clocked in at ' + startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No activity yet'}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
