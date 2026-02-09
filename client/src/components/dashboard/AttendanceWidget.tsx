import React, { useState, useEffect } from 'react';
import { useAttendanceWidget } from '../../hooks/useAttendanceWidget';
import { Icon } from '../ui/Icons';

export const AttendanceWidget: React.FC = () => {
    const {
        clockedIn,
        onBreak,
        workDuration,
        clockingLoading,
        handleClockIn,
        handleClockOut,
        handleStartBreak,
        handleEndBreak,
        shiftDetails,
        shiftProgress,
        status
    } = useAttendanceWidget();

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (clockingLoading) {
        return (
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-center min-h-[220px]">
                <div className="flex flex-col items-center gap-3 animate-pulse">
                    <div className="w-16 h-16 rounded-full bg-slate-200"></div>
                    <div className="h-4 w-32 bg-slate-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[var(--bg-surface)] p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            {/* Header: Web Clock Title & Status */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Web Clock</h3>
                    <div className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                        {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
                    </div>
                </div>

                {status !== 'none' && (
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === 'late' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        }`}>
                        {status === 'late' ? 'Late In' : 'On Time'}
                    </div>
                )}
            </div>

            {/* Main Clock Display */}
            <div className="flex flex-col items-center justify-center flex-1">
                <div className="text-5xl font-black text-[var(--text-main)] font-mono tracking-tighter tabular-nums">
                    {clockedIn ? workDuration : currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
                <p className="text-xs font-bold uppercase mt-2 text-[var(--text-muted)] tracking-widest">
                    {clockedIn ? (onBreak ? 'On Break' : 'Work Duration') : 'Current Time'}
                </p>

                {/* Shift Progress Bar */}
                {clockedIn && shiftDetails && (
                    <div className="w-full max-w-[200px] h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-4 overflow-hidden">
                        {/* eslint-disable-next-line react/forbid-component-props */}
                        {/* eslint-disable-next-line react/forbid-component-props */}
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${onBreak ? 'bg-amber-400' : 'bg-[var(--primary)]'}`}
                            style={{ width: `${shiftProgress}%` }}
                        ></div>
                    </div>
                )}

                {shiftDetails && !clockedIn && (
                    <div className="text-xs text-[var(--text-muted)] mt-4 font-medium">
                        Shift: {shiftDetails.start} - {shiftDetails.end}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="mt-6">
                {!clockedIn ? (
                    <button
                        onClick={handleClockIn}
                        disabled={clockingLoading}
                        className="w-full btn-primary py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 hover:scale-[1.02] transition-transform active:scale-95"
                    >
                        <Icon name="login" size={20} />
                        <span className="font-bold">Clock In</span>
                    </button>
                ) : (
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleClockOut}
                            disabled={clockingLoading}
                            className="bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all active:scale-95 shadow-sm shadow-rose-100 w-full"
                        >
                            <Icon name="logout" size={20} /> Clock Out
                        </button>

                        {onBreak ? (
                            <button
                                onClick={handleEndBreak}
                                disabled={clockingLoading}
                                className="bg-amber-100 text-amber-900 border border-amber-200 hover:bg-amber-200 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all active:scale-95 w-full"
                            >
                                <Icon name="play" size={18} /> Resume Work
                            </button>
                        ) : (
                            <button
                                onClick={handleStartBreak}
                                disabled={clockingLoading}
                                className="text-slate-500 hover:text-slate-800 hover:bg-slate-50 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all active:scale-95 w-full text-sm"
                            >
                                <Icon name="pause" size={16} /> Take a Break
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
