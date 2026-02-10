import React from 'react';
import { Icon } from './Icons';
import type { AppIconName } from './Icons';

export interface TabItem {
    id: string;
    label: string;
    icon?: AppIconName;
}

interface TabsProps {
    tabs: TabItem[];
    activeTab: string;
    onChange: (id: string) => void;
    variant?: 'pills' | 'underline';
    className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
    tabs,
    activeTab,
    onChange,
    variant = 'pills',
    className = ''
}) => {
    if (variant === 'underline') {
        return (
            <div className={`flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar ${className}`}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`pb-3 px-6 font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                            ? 'border-[var(--primary)] text-[var(--primary)]'
                            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                    >
                        {tab.icon && <Icon name={tab.icon} size={16} />}
                        {tab.label}
                    </button>
                ))}
            </div>
        );
    }

    // Default 'pills' variant (Glassy/Premium look)
    return (
        <div className={`flex gap-2 mb-8 overflow-x-auto no-scrollbar bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-full md:w-fit ${className}`}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`px-4 py-2 font-medium rounded-lg text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab.id
                        ? 'bg-white dark:bg-slate-700 text-[var(--primary)] shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                        }`}
                >
                    {tab.icon && <Icon name={tab.icon} size={16} />}
                    {tab.label}
                </button>
            ))}
        </div>
    );
};
