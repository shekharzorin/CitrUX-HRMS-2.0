import React from 'react';
import { Icon } from '../ui/Icons';
import { Avatar } from '../ui/Avatar';

interface TeamMember {
    id: string;
    name: string;
    role: string;
    status: 'working' | 'onbreak' | 'offline';
    avatar?: string;
}

export const TeamList: React.FC = () => {
    const members: TeamMember[] = [
        { id: '1', name: 'Alex Johnson', role: 'UI Developer', status: 'working' },
        { id: '2', name: 'Maria Garcia', role: 'Project Manager', status: 'onbreak' },
        { id: '3', name: 'David Smith', role: 'Backend Dev', status: 'offline' },
        { id: '4', name: 'Emma Wilson', role: 'QA Lead', status: 'working' },
    ];

    const getStatusInfo = (status: TeamMember['status']) => {
        switch (status) {
            case 'working': return { color: 'bg-emerald-500', text: 'Working' };
            case 'onbreak': return { color: 'bg-amber-500', text: 'On Break' };
            case 'offline': return { color: 'bg-slate-400', text: 'Offline' };
        }
    };

    return (
        <div className="card-premium p-6 bg-white">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-800">My Team</h3>
                    <p className="text-xs text-slate-500 font-medium">Real-time status</p>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                        <Icon name="search" size={16} />
                    </button>
                    <button className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                        <Icon name="filters" size={16} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {members.map((member) => {
                    const statusInfo = getStatusInfo(member.status);
                    return (
                        <div key={member.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Avatar name={member.name} size="40px" />
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-50 ${statusInfo.color}`}></div>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 leading-tight">{member.name}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">{member.role}</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm hover:bg-indigo-50" title="Message">
                                    <Icon name="chat" size={14} />
                                </button>
                                <button className="p-2 bg-white text-slate-600 rounded-lg shadow-sm hover:bg-slate-50" title="View Profile">
                                    <Icon name="eye" size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
