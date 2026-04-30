import React from 'react';
import { StatusBadge } from './StatusBadge';
import { Icon } from '../ui/Icons';

interface AttendanceRecord {
    id: string;
    date: string;
    checkIn: string;
    checkOut?: string;
    hours?: number;
    status: string;
    breaks: any[];
    user?: any;
}

interface AttendanceTableProps {
    records: AttendanceRecord[];
    canViewAll: boolean;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
    records,
    canViewAll,
    currentPage,
    totalPages,
    onPageChange,
    isLoading
}) => {
    const safeTime = (dateStr: string | undefined) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { return '-'; }
    };

    const safeDate = (dateStr: string | undefined) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
        } catch { return 'Invalid Date'; }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Loading records...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                {canViewAll && <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee</th>}
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clock In</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clock Out</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Break Time</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Work Hours</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overtime</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {records.length > 0 ? records.map((record) => (
                                <tr key={record.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-slate-700 text-sm">{safeDate(record.date)}</span>
                                    </td>
                                    {canViewAll && (
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                                                    {record.user?.profile?.firstName?.[0] || 'U'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-800 leading-none">
                                                        {record.user?.profile?.firstName} {record.user?.profile?.lastName}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">
                                                        {record.user?.employeeId}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded">
                                            {safeTime(record.checkIn)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded">
                                            {safeTime(record.checkOut)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1 flex-wrap">
                                            {record.breaks?.length > 0 ? (
                                                <span className="text-xs font-medium text-slate-500">
                                                    {record.breaks.reduce((acc, b) => acc + (b.duration || 0), 0).toFixed(0)}m total
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                                            {record.hours ? `${record.hours.toFixed(1)}h` : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {record.hours && record.hours > 9 ? (
                                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                                <Icon name="trending_up" size={14} />
                                                +{(record.hours - 9).toFixed(1)}h
                                            </span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={record.status} />
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={canViewAll ? 8 : 7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-40">
                                            <Icon name="search" size={48} />
                                            <p className="font-bold text-slate-500">No attendance records found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
                {records.length > 0 ? records.map((record) => (
                    <div key={record.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Date</div>
                                <div className="font-bold text-slate-800">{safeDate(record.date)}</div>
                            </div>
                            <StatusBadge status={record.status} />
                        </div>
                        
                        {canViewAll && (
                            <div className="flex items-center gap-3 py-3 border-y border-slate-50">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                    {record.user?.profile?.firstName?.[0]}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-800">
                                        {record.user?.profile?.firstName} {record.user?.profile?.lastName}
                                    </div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest">
                                        {record.user?.employeeId}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">In / Out</div>
                                <div className="text-sm font-bold text-slate-700">
                                    {safeTime(record.checkIn)} - {safeTime(record.checkOut)}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Work Hours</div>
                                <div className="text-sm font-black text-indigo-600">
                                    {record.hours ? `${record.hours.toFixed(1)}h` : '-'}
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center opacity-50">
                        No records found
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => onPageChange(currentPage - 1)}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-100 transition-colors"
                        >
                            <Icon name="chevron_left" size={20} />
                        </button>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => onPageChange(currentPage + 1)}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-100 transition-colors"
                        >
                            <Icon name="chevron_right" size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
