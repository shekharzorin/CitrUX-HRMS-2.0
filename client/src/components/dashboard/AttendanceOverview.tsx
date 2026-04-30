import React from 'react';
import { Icon } from '../ui/Icons';

export const AttendanceOverview: React.FC = () => {
    // Mock counts, should come from stats API
    const data = [
        { label: 'Present', count: 42, color: 'bg-emerald-500', icon: 'check_circle' },
        { label: 'Absent', count: 3, color: 'bg-rose-500', icon: 'cancel' },
        { label: 'Leave', count: 5, color: 'bg-indigo-500', icon: 'event' },
        { label: 'Late', count: 2, color: 'bg-amber-500', icon: 'schedule' },
    ];

    return (
        <div className="card-premium p-6 h-full flex flex-col bg-white">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-800">Today's Overview</h3>
                    <p className="text-xs text-slate-500 font-medium">Headcount & attendance</p>
                </div>
                <button className="text-xs font-bold text-indigo-600 hover:underline">View All</button>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
                {data.map((item) => (
                    <div key={item.label} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center group hover:bg-white hover:shadow-md transition-all">
                        <div className={`p-2 rounded-xl ${item.color} text-white mb-2 shadow-lg shadow-${item.color.split('-')[1]}-200 group-hover:scale-110 transition-transform`}>
                            <Icon name={item.icon as any} size={16} />
                        </div>
                        <span className="text-2xl font-black text-slate-800 tracking-tighter">{item.count}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.label}</span>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                            {String.fromCharCode(64 + i)}
                        </div>
                    ))}
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">
                        +2
                    </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Top Absentees</span>
            </div>
        </div>
    );
};
