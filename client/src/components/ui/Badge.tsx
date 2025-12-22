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
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    // Using inline styles or Tailwind classes that map to variables
    // Since we have tailwind classes for text active, let's use style for bg with opacity

    const getVariantStyle = (v: string) => {
        switch (v) {
            case 'success': return { backgroundColor: 'color-mix(in srgb, var(--success), transparent 85%)', color: 'var(--success)' };
            case 'warning': return { backgroundColor: 'color-mix(in srgb, var(--warning), transparent 85%)', color: 'var(--warning)' };
            case 'error': return { backgroundColor: 'color-mix(in srgb, var(--error), transparent 85%)', color: 'var(--error)' };
            case 'info': return { backgroundColor: 'color-mix(in srgb, var(--info), transparent 85%)', color: 'var(--info)' };
            default: return { backgroundColor: 'var(--bg-body)', color: 'var(--text-muted)' };
        }
    };

    return (
        <span
            className={`${baseClasses} ${className}`}
            style={getVariantStyle(variant)}
            {...props}
        >
            {children}
        </span>
    );
};
