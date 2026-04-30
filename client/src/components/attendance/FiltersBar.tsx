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
    const [activePreset, setActivePreset] = useState<string | null>(null);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            onSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, onSearch]);

    const setPreset = (preset: 'today' | 'week' | 'month') => {
        const now = new Date();
        let start = new Date();
        const end = now.toISOString().split('T')[0];

        if (preset === 'today') {
            start = now;
        } else if (preset === 'week') {
            start.setDate(now.getDate() - 7);
        } else if (preset === 'month') {
            start.setMonth(now.getMonth() - 1);
        }

        const startStr = start.toISOString().split('T')[0];
        setStartDate(startStr);
        setEndDate(end);
        onDateRangeChange(startStr, end);
        setActivePreset(preset);
    };

    const handleReset = () => {
        setSearchQuery('');
        setStatus('ALL');
        setStartDate('');
        setEndDate('');
        setActivePreset(null);
        onReset();
    };

    return (
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row gap-6 items-end">
                
                {/* Search */}
                <div className="flex-1 w-full">
                    <label htmlFor="search-records" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Search Records</label>
                    <div className="relative">
                        <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            id="search-records"
                            type="text"
                            placeholder={canViewAll ? "Search name, ID or date..." : "Search by date (YYYY-MM-DD)..."}
                            className="w-full pl-12 pr-4 h-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Status */}
                <div className="w-full lg:w-56">
                    <label htmlFor="status-filter" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Status</label>
                    <select 
                        id="status-filter"
                        title="Filter by status"
                        className="w-full px-4 h-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
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

                {/* Date Range */}
                <div className="flex gap-3 w-full lg:w-auto">
                    <div className="flex-1 lg:w-40">
                        <label htmlFor="start-date" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">From</label>
                        <input 
                            id="start-date"
                            type="date"
                            title="Start date"
                            className="w-full px-4 h-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                onDateRangeChange(e.target.value, endDate);
                                setActivePreset(null);
                            }}
                        />
                    </div>
                    <div className="flex-1 lg:w-40">
                        <label htmlFor="end-date" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">To</label>
                        <input 
                            id="end-date"
                            type="date"
                            title="End date"
                            className="w-full px-4 h-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                onDateRangeChange(startDate, e.target.value);
                                setActivePreset(null);
                            }}
                        />
                    </div>
                </div>

                {/* Reset */}
                <button 
                    onClick={handleReset}
                    title="Reset Filters"
                    aria-label="Reset all filters"
                    className="h-12 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all flex items-center gap-2 whitespace-nowrap"
                >
                    <Icon name="refresh" size={18} />
                </button>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-3 pt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Quick Presets:</span>
                <button 
                    onClick={() => setPreset('today')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activePreset === 'today' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                    Today
                </button>
                <button 
                    onClick={() => setPreset('week')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activePreset === 'week' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                    This Week
                </button>
                <button 
                    onClick={() => setPreset('month')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activePreset === 'month' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                    This Month
                </button>
            </div>
        </div>
    );
};
