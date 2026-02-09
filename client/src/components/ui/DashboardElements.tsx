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

interface StatsCardPremiumProps {
    title: string;
    value: string | number;
    subtext: string;
    icon: IconName;
    variant: 'purple' | 'green' | 'orange' | 'blue';
    trend?: string;
}

export const StatsCardPremium = ({ title, value, subtext, icon, variant, trend }: StatsCardPremiumProps) => {
    // Reference Image matching: SOLID pastel backgrounds
    const variants = {
        purple: 'bg-[#E0C6FD] dark:bg-purple-900/20 text-[#581c87] dark:text-purple-200 border border-transparent dark:border-purple-800/30',
        green: 'bg-[#bef264] dark:bg-lime-900/20 text-[#365314] dark:text-lime-200 border border-transparent dark:border-lime-800/30',
        orange: 'bg-[#FFedd5] dark:bg-orange-900/20 text-[#7c2d12] dark:text-orange-200 border border-transparent dark:border-orange-800/30',
        blue: 'bg-[#BAE6FD] dark:bg-sky-900/20 text-[#0c4a6e] dark:text-sky-200 border border-transparent dark:border-sky-800/30',
    };

    // Icons: simple outline style, usually just slightly darker or white bg
    const iconColors = {
        purple: 'bg-white/20 text-[#581c87] dark:text-purple-200',
        green: 'bg-white/20 text-[#365314] dark:text-lime-200',
        orange: 'bg-white/20 text-[#7c2d12] dark:text-orange-200',
        blue: 'bg-white/20 text-[#0c4a6e] dark:text-sky-200',
    };

    return (
        <div className={`rounded-[2rem] p-6 relative overflow-hidden transition-all hover:scale-[1.02] shadow-sm ${variants[variant]} flex flex-col h-48 justify-between`}>
            {/* Soft gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>

            <div className="relative z-10 flex justify-between items-start">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm ${iconColors[variant]}`}>
                    <Icon name={icon} size={20} />
                </div>
                {trend && (
                    <div className="bg-white/40 text-inherit px-2 py-1 rounded-full text-xs font-bold backdrop-blur-md">
                        {trend}
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <h4 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{title}</h4>
                <div className="text-4xl font-bold mb-1 tracking-tight">{value}</div>
                <div className="text-xs font-medium opacity-80">{subtext}</div>
            </div>

            {/* Decorative large circle in corner matches reference style */}
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>
        </div>
    );
};

