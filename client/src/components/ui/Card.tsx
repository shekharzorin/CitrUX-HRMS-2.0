import React, { type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    noPadding?: boolean;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
    className = '',
    children,
    noPadding = false,
    onClick,
    ...props
}) => {
    return (
        <div
            className={`card-premium ${noPadding ? '' : 'p-6'} ${onClick ? 'cursor-pointer hover:shadow-lg' : ''} ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    );
};
