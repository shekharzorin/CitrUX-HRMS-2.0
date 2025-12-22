import React, { type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'dashboard';
}

export const Card: React.FC<CardProps> = ({
    className = '',
    variant = 'default',
    children,
    ...props
}) => {
    const variantClasses = {
        default: 'card',
        glass: 'glass-panel',
        dashboard: 'dashboard-card',
    };

    return (
        <div className={`${variantClasses[variant]} ${className}`} {...props}>
            {children}
        </div>
    );
};
