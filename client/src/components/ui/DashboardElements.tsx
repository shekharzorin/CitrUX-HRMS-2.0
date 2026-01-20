import React from 'react';
import { Icon, type IconName } from './Icons';

interface WidgetHeaderProps {
    title: string;
    icon?: IconName;
    action?: React.ReactNode;
    className?: string;
}

export const WidgetHeader = ({ title, icon, action, className = "" }: WidgetHeaderProps) => (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
        <div className="flex items-center gap-3">
            {icon && (
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-[var(--primary)] shadow-sm">
                    <Icon name={icon} size={20} />
                </div>
            )}
            <h3 className="font-bold text-lg text-[var(--text-main)] tracking-tight">{title}</h3>
        </div>
        {action}
    </div>
);

interface StatBoxProps {
    label: string;
    value: string | number;
    sub?: string;
    color?: string;
    icon?: IconName;
    className?: string;
}

export const StatBox = ({ label, value, sub, color = "text-[var(--text-main)]", icon, className = "" }: StatBoxProps) => (
    <div className={`card-premium p-5 flex flex-col justify-between h-full bg-white dark:bg-slate-800 border-none shadow-sm hover:shadow-md transition-all ${className}`}>
        <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
            {icon && (
                <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-400 group-hover:text-[var(--primary)] transition-colors`}>
                    <Icon name={icon} size={18} />
                </div>
            )}
        </div>
        <div>
            <div className={`text-4xl font-bold font-heading mb-1 ${color}`}>{value}</div>
            {sub && <div className="text-xs text-[var(--text-muted)] font-medium flex items-center gap-1">
                {sub.startsWith('+') ? <span className="text-emerald-500 bg-emerald-50 px-1 rounded">▲</span> : null}
                {sub}
            </div>}
        </div>
    </div>
);
