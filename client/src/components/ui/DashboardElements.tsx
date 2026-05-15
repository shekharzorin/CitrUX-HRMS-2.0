import React from 'react';
import { Icon, type AppIconName } from './Icons';

interface StatBoxProps {
    label: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    color?: string;
    icon?: AppIconName;
    className?: string;
}

interface StatsCardPremiumProps {
    title: string;
    value: React.ReactNode;
    subtext?: React.ReactNode;
    icon: AppIconName;
    variant: 'purple' | 'green' | 'orange' | 'blue';
    trend?: string;
}

interface WidgetHeaderProps {
    title: string;
    icon?: AppIconName;
    action?: React.ReactNode;
    className?: string;
}

export const WidgetHeader = ({ title, icon, action, className = "" }: WidgetHeaderProps) => (
    <div className={`flex items-center justify-between mb-5 ${className}`}>
        <div className="flex items-center gap-2.5">
            {icon && (
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <Icon name={icon} size={16} />
                </div>
            )}
            <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">{title}</h3>
        </div>
        {action}
    </div>
);

export const StatBox = ({ label, value, sub, color = "text-slate-900", icon, className = "" }: StatBoxProps) => (
    <div className={`card-premium p-4 flex flex-col justify-between h-full ${className}`}>
        <div className="flex items-start justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            {icon && (
                <div className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-400">
                    <Icon name={icon} size={14} />
                </div>
            )}
        </div>
        <div>
            <div className={`text-2xl font-bold tracking-tight mb-0.5 ${color}`}>{value}</div>
            {sub && (
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    {sub}
                </div>
            )}
        </div>
    </div>
);

export const StatsCardPremium = ({ title, value, subtext, icon, variant, trend }: StatsCardPremiumProps) => {
    const accentColors = {
        purple: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10',
        green: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10',
        orange: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
        blue: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10',
    };

    return (
        <div className="card-premium p-5 flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentColors[variant]}`}>
                    <Icon name={icon} size={18} />
                </div>
                {trend && (
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {trend}
                    </div>
                )}
            </div>

            <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{title}</h4>
                <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</div>
                    <div className="text-[11px] font-medium text-slate-500 truncate">{subtext}</div>
                </div>
            </div>
        </div>
    );
};

