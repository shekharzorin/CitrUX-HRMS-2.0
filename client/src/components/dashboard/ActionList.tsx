import React from 'react';
import { Icon } from '../ui/Icons';
import { Avatar } from '../ui/Avatar';

interface ActionItem {
    id: string;
    type: 'leave' | 'expense';
    employee: string;
    detail: string;
    status: string;
    date: string;
}

export const ActionList: React.FC = () => {
    // Mock data for now, should come from API
    const actions: ActionItem[] = [
        { id: '1', type: 'leave', employee: 'John Doe', detail: 'Sick Leave - 2 days', status: 'URGENT', date: 'Today' },
        { id: '2', type: 'expense', employee: 'Sarah Smith', detail: 'Travel Reimbursement - ₹4,500', status: 'PENDING', date: 'Yesterday' },
        { id: '3', type: 'leave', employee: 'Mike Ross', detail: 'Casual Leave - 1 day', status: 'PENDING', date: '2 hours ago' },
    ];

    return (
        <div className="card-premium p-6 h-full flex flex-col bg-white">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-800">Action Required</h3>
                    <p className="text-xs text-slate-500 font-medium">{actions.length} items need your attention</p>
                </div>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Icon name="event" size={20} />
                </div>
            </div>

            <div className="space-y-4 flex-1">
                {actions.map((action) => (
                    <div key={action.id} className="group p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <Avatar name={action.employee} size="32px" />
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{action.employee}</p>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{action.type}</p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-md ${
                                action.status === 'URGENT' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                                {action.status}
                            </span>
                        </div>
                        
                        <p className="text-xs text-slate-600 font-medium mb-4 line-clamp-1">{action.detail}</p>
                        
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition-colors">Approve</button>
                            <button className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold rounded-lg transition-colors">Reject</button>
                            <button className="flex-1 py-2 bg-white text-slate-600 border border-slate-200 text-[10px] font-bold rounded-lg transition-colors">View</button>
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full mt-6 py-3 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
                View All Pending Approvals
            </button>
        </div>
    );
};
