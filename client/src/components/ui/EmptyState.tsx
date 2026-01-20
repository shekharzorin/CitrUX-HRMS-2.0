import React from 'react';
import { Icon, type IconName } from './Icons';
import { Button } from './Button';

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: IconName;
    action?: React.ReactNode | {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    icon = 'campaign',
    action,
    className = ''
}) => {
    return (
        <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-[28px] flex items-center justify-center mb-6 text-[var(--text-muted)] border border-[var(--border-light)] transform -rotate-3">
                <Icon name={icon} size={36} className="transform rotate-3" />
            </div>

            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">
                {title}
            </h3>

            {description && (
                <p className="text-[var(--text-muted)] max-w-sm mb-8 leading-relaxed">
                    {description}
                </p>
            )}

            {action && (
                React.isValidElement(action) ? action : (
                    <Button variant="primary" onClick={(action as any).onClick} leftIcon={<Icon name="plus" size={18} />}>
                        {(action as any).label}
                    </Button>
                )
            )}
        </div>
    );
};
