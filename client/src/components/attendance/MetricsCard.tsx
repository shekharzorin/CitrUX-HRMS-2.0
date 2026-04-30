import React from 'react';
import { Icon, AppIconName } from '../ui/Icons';

interface MetricsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: AppIconName;
    trend?: string;
    trendUp?: boolean;
    color?: 'indigo' | 'emerald' | 'amber' | 'blue' | 'purple';
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    trend,
    trendUp,
    color = 'indigo'
}) => {
    const getColorClasses = () => {
        switch (color) {
            case 'emerald': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'amber': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'blue': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'purple': return 'bg-purple-50 text-purple-600 border-purple-100';
            default: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
        }
    };

    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getColorClasses()}`}>
                    {icon && <Icon name={icon} size={20} />}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        <Icon name={trendUp ? 'trending_up' : 'trending_down'} size={14} />
                        {trend}
                    </div>
                )}
            </div>
            
            <div>
                <h3 className="text-sm font-bold text-slate-500 mb-1">{title}</h3>
                <div className="text-2xl font-black text-slate-800">{value}</div>
                {subtitle && (
                    <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>
                )}
            </div>
        </div>
    );
};
