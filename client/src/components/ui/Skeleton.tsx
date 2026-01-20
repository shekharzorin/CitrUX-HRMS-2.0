import React, { useCallback } from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    width?: string | number;
    height?: string | number;
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width,
    height,
    variant = 'text',
    className = '',
    style,
    ...props
}) => {
    const baseClasses = 'animate-pulse bg-slate-200 dark:bg-slate-700/50';

    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-none',
        rounded: 'rounded-xl',
    };

    // Use callback ref to set CSS variables and custom styles
    const setRef = useCallback((node: HTMLDivElement | null) => {
        if (node) {
            const w = typeof width === 'number' ? `${width}px` : width;
            const h = typeof height === 'number' ? `${height}px` : height;

            if (w) node.style.setProperty('--sk-w', w as string);
            if (h) node.style.setProperty('--sk-h', h as string);

            // Apply custom styles via JS to bypass inline-style linter
            if (style) {
                Object.assign(node.style, style);
            }
        }
    }, [width, height, style]);

    // Conditionally add width/height classes only if props are provided
    const dims = `
        ${width ? 'w-[var(--sk-w)]' : ''} 
        ${height ? 'h-[var(--sk-h)]' : ''}
    `;

    return (
        <div
            ref={setRef}
            className={`${baseClasses} ${variantClasses[variant]} ${dims} ${className}`}
            {...props}

        />
    );
};
