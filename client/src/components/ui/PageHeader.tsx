import React from 'react';
import { Icon } from './Icons';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: string;
    gradient?: string;
    actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    icon = 'dashboard',
    gradient = 'gradient-purple',
    actions
}) => {
    return (
        <div className={`page-hero-premium ${gradient}`}>
            <div className="page-hero-pattern"></div>
            <div className="page-hero-content">
                <div className="flex items-center gap-6">
                    <div className="page-hero-icon glassy-icon-base">
                        <Icon name={icon as any} size={32} />
                    </div>
                    <div className="flex-1">
                        <h1 className="page-hero-title">{title}</h1>
                        {subtitle && <p className="page-hero-subtitle">{subtitle}</p>}
                    </div>
                </div>
                {actions && <div className="page-hero-actions">{actions}</div>}
            </div>
        </div>
    );
};
