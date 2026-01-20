import React, { type HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
}

export const Badge: React.FC<BadgeProps> = ({
    className = '',
    variant = 'default',
    children,
    ...props
}) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border';

    const variantClasses = {
        success: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30',
        warning: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30',
        error: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30',
        info: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30',
        default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    };

    return (
        <span
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
};
