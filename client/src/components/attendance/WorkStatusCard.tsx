import React from 'react';
import { Icon } from '../ui/Icons';

interface WorkStatusCardProps {
    clockedInToday: any; // Type it later properly or use any for now
    onBreak: boolean;
    currentTime: Date;
    elapsedTime: string;
    handleClockIn: () => void;
    handleClockOut: () => void;
    handleStartBreak: () => void;
    handleEndBreak: () => void;
}

export const WorkStatusCard: React.FC<WorkStatusCardProps> = ({
    clockedInToday,
    onBreak,
    currentTime,
    elapsedTime,
    handleClockIn,
    handleClockOut,
    handleStartBreak,
    handleEndBreak
}) => {
    const safeTime = (dateStr: string | undefined) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { return '-'; }
    };

    const getStatusText = () => {
        if (!clockedInToday) return 'Not Clocked In';
        if (onBreak) return 'On Break';
        return 'Working';
    };

    const getStatusColor = () => {
        if (!clockedInToday) return 'bg-slate-200';
        if (onBreak) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    return (
        <div className="dashboard-section animate-fade-in relative overflow-hidden group shadow-md border border-slate-100 rounded-2xl flex flex-col h-full bg-white">
            <div className="absolute top-[-20px] right-[-20px] p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon name="schedule" size={160} />
            </div>

            <div className="p-6 relative z-10 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Current Status</h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`w-3 h-3 rounded-full ${getStatusColor()} ${clockedInToday && 'animate-pulse'}`}></span>
                            <span className="text-sm font-semibold text-slate-600">
                                {getStatusText()}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-slate-800 tracking-tight font-mono">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                            {new Date().toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center py-4">
                    <div className={`p-6 rounded-full border-4 ${!clockedInToday ? 'border-slate-100' : onBreak ? 'border-amber-100' : 'border-indigo-100'} w-48 h-48 flex flex-col items-center justify-center transition-colors duration-500`}>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                            Work Duration
                        </div>
                        <div className={`text-4xl font-black tracking-wider font-mono ${!clockedInToday ? 'text-slate-300' : onBreak ? 'text-amber-600' : 'text-indigo-600'}`}>
                            {elapsedTime}
                        </div>
                        {clockedInToday && (
                            <div className="text-xs text-slate-500 mt-2 font-medium">
                                In at {safeTime(clockedInToday.checkIn)}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                    {!clockedInToday ? (
                        <button onClick={handleClockIn} className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                            <Icon name="login" size={20} /> Clock In Now
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            {!onBreak ? (
                                <button onClick={handleStartBreak} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                    <Icon name="pause" size={18} /> Take Break
                                </button>
                            ) : (
                                <button onClick={handleEndBreak} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                    <Icon name="play" size={18} /> Resume Work
                                </button>
                            )}
                            <button
                                onClick={handleClockOut}
                                disabled={onBreak}
                                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                <Icon name="logout" size={18} /> Clock Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
