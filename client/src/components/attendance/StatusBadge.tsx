import React from 'react';

interface StatusBadgeProps {
    status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const getStatusStyles = () => {
        switch (status.toUpperCase()) {
            case 'PRESENT':
                return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
            case 'ABSENT':
                return 'bg-red-100 text-red-700 border border-red-200';
            case 'LEAVE':
                return 'bg-blue-100 text-blue-700 border border-blue-200';
            case 'HALF DAY':
                return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
            case 'LATE':
                return 'bg-orange-100 text-orange-700 border border-orange-200';
            default:
                return 'bg-slate-100 text-slate-700 border border-slate-200';
        }
    };

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${getStatusStyles()}`}>
            {status}
        </span>
    );
};
