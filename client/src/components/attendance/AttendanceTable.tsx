import React, { useState, useMemo } from 'react';
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
    isLoading?: boolean;
    canViewAll?: boolean;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
    records,
    isLoading,
    canViewAll = false
}) => {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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

    // Sorting Logic
    const sortedRecords = useMemo(() => {
        let sortableItems = [...records];
        if (sortConfig.key) {
            sortableItems.sort((a: any, b: any) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                
                if (sortConfig.key === 'date') {
                    aVal = new Date(a.date).getTime();
                    bVal = new Date(b.date).getTime();
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [records, sortConfig]);

    // Pagination Logic
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedRecords.slice(start, start + itemsPerPage);
    }, [sortedRecords, currentPage]);

    const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);

    const toggleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-bold tracking-tight">Syncing attendance data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th onClick={() => toggleSort('date')} className="px-8 py-5 cursor-pointer group">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                                        <Icon name={sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? 'chevron_up' : 'chevron_down') : 'more_horizontal'} size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                </th>
                                {canViewAll && <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>}
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Timing</th>
                                <th onClick={() => toggleSort('hours')} className="px-8 py-5 cursor-pointer group text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Work Hours</span>
                                        <Icon name={sortConfig.key === 'hours' ? (sortConfig.direction === 'asc' ? 'chevron_up' : 'chevron_down') : 'more_horizontal'} size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                </th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-8 py-5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedRecords.length > 0 ? paginatedRecords.map((record) => (
                                <React.Fragment key={record.id}>
                                    <tr className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${expandedRow === record.id ? 'bg-indigo-50/30' : ''}`} onClick={() => setExpandedRow(expandedRow === record.id ? null : record.id)}>
                                        <td className="px-8 py-6">
                                            <div className="font-bold text-slate-900 text-sm">{safeDate(record.date)}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-tight">Regular Shift</div>
                                        </td>
                                        {canViewAll && (
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                        {record.user?.profile?.firstName?.[0]}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-800 leading-none">{record.user?.profile?.firstName} {record.user?.profile?.lastName}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold mt-1 tracking-widest">{record.user?.employeeId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="text-center">
                                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-0.5">IN</div>
                                                    <div className="font-mono text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{safeTime(record.checkIn)}</div>
                                                </div>
                                                <div className="w-4 h-px bg-slate-100"></div>
                                                <div className="text-center">
                                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-0.5">OUT</div>
                                                    <div className="font-mono text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{safeTime(record.checkOut)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="text-lg font-black text-slate-900 font-mono tracking-tighter">
                                                {record.hours ? `${record.hours.toFixed(1)}` : '0.0'}<span className="text-[10px] text-slate-400 ml-0.5 uppercase">hrs</span>
                                            </div>
                                            {record.hours && record.hours > 8.5 && (
                                                <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Overtime: +{(record.hours - 8).toFixed(1)}h</div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <StatusBadge status={record.status} />
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div 
                                                title={expandedRow === record.id ? "Collapse" : "Expand"}
                                                aria-label={expandedRow === record.id ? "Collapse row" : "Expand row"}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${expandedRow === record.id ? 'bg-indigo-600 text-white rotate-180' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}
                                            >
                                                <Icon name="chevron_down" size={18} />
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRow === record.id && (
                                        <tr className="bg-slate-50/50">
                                            <td colSpan={canViewAll ? 6 : 5} className="px-12 py-8">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                                            <Icon name="pause" size={14} className="text-amber-500" /> Break Details
                                                        </h4>
                                                        {record.breaks?.length > 0 ? (
                                                            <div className="space-y-3">
                                                                {record.breaks.map((b: any, idx: number) => (
                                                                    <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100">
                                                                        <span className="text-xs font-black text-slate-400 uppercase">Session #{idx + 1}</span>
                                                                        <span className="font-mono text-xs font-bold text-slate-700">{safeTime(b.startTime)} → {safeTime(b.endTime)}</span>
                                                                        <span className="text-xs font-black text-amber-600">{b.duration ? `${b.duration}m` : 'In Progress'}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm font-bold text-slate-400 italic">No breaks taken this day</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                                            <Icon name="info" size={14} className="text-blue-500" /> System Remarks
                                                        </h4>
                                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-4">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-slate-400 font-bold">Punch Location</span>
                                                                <span className="text-slate-800 font-black">Main Office - Ground Floor</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-slate-400 font-bold">Shift Compliance</span>
                                                                <span className="text-emerald-600 font-black">98.5% (On Time)</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )) : (
                                <tr>
                                    <td colSpan={canViewAll ? 6 : 5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-30">
                                            <Icon name="search" size={48} />
                                            <p className="text-xl font-black text-slate-400">No records found matching filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-8">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, records.length)} of {records.length} records
                    </div>
                    <div className="flex gap-2">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            title="Previous Page"
                            aria-label="Go to previous page"
                            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <Icon name="chevron_left" size={20} />
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button 
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                title={`Page ${i + 1}`}
                                aria-label={`Go to page ${i + 1}`}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            title="Next Page"
                            aria-label="Go to next page"
                            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <Icon name="chevron_right" size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
