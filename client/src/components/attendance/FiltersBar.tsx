import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icons';

interface FiltersBarProps {
    onSearch: (query: string) => void;
    onStatusFilter: (status: string) => void;
    onDateRangeChange: (start: string, end: string) => void;
    onReset: () => void;
    canViewAll: boolean;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
    onSearch,
    onStatusFilter,
    onDateRangeChange,
    onReset,
    canViewAll
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [status, setStatus] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            onSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, onSearch]);

    const handleReset = () => {
        setSearchQuery('');
        setStatus('ALL');
        setStartDate('');
        setEndDate('');
        onReset();
    };

    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                {canViewAll && (
                    <div className="flex-1 w-full">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                            Search Employee
                        </label>
                        <div className="relative">
                            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Name or ID..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <div className="w-full md:w-48">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                        Status Filter
                    </label>
                    <select 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            onStatusFilter(e.target.value);
                        }}
                    >
                        <option value="ALL">All Status</option>
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LEAVE">Leave</option>
                        <option value="HALF DAY">Half Day</option>
                        <option value="LATE">Late</option>
                    </select>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="flex-1 md:w-40">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                            From Date
                        </label>
                        <input 
                            type="date"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                onDateRangeChange(e.target.value, endDate);
                            }}
                        />
                    </div>
                    <div className="flex-1 md:w-40">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                            To Date
                        </label>
                        <input 
                            type="date"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                onDateRangeChange(startDate, e.target.value);
                            }}
                        />
                    </div>
                </div>

                <button 
                    onClick={handleReset}
                    className="w-full md:w-auto px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                    <Icon name="refresh" size={16} />
                    Reset
                </button>
            </div>
        </div>
    );
};
