import React from 'react';
import { Icon } from '../ui/Icons';

interface EmployeeCardProps {
    user: any; // Ideally this should be a proper User type
    isSuperAdmin?: boolean;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ user, isSuperAdmin }) => {
    if (!user || isSuperAdmin) return null;

    const profile = user.profile || {};
    const initials = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || '??';

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
                <div className="relative">
                    {profile.avatar ? (
                        <img 
                            src={profile.avatar} 
                            alt={profile.firstName} 
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-50 shadow-sm"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
                            {initials}
                        </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                
                <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">
                        {profile.firstName} {profile.lastName}
                    </h3>
                    <p className="text-sm font-medium text-indigo-600 mt-0.5">
                        {profile.designation || user.role}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Emp ID:
                        </span>
                        <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {user.employeeId || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-6 space-y-3 pt-6 border-t border-slate-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Icon name="schedule" size={14} className="text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">Shift Timing</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700">09:00 AM - 06:00 PM</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Icon name="location" size={14} className="text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">Work Location</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700">Remote / Office</span>
                </div>
            </div>

            <div className="mt-6 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/50 flex items-center gap-3">
                <div className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm">
                    <Icon name="info" size={14} />
                </div>
                <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
                    Ensure your clock-in/out matches your assigned shift for accurate tracking.
                </p>
            </div>
        </div>
    );
};
