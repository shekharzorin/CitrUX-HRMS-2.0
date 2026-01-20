import React, { useState } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    className = ''
}) => {
    const [isVisible, setIsVisible] = useState(false);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    return (
        <div
            className={`relative inline-block ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div
                    className={`
                        absolute z-50 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg shadow-xl whitespace-nowrap animate-scale-up pointer-events-none
                        ${positionClasses[position]}
                    `}
                >
                    {content}
                    {/* Arrow */}
                    <div
                        className={`
                            absolute w-2 h-2 bg-slate-900 transform rotate-45
                            ${position === 'top' ? 'bottom-[-3px] left-1/2 -translate-x-1/2' : ''}
                            ${position === 'bottom' ? 'top-[-3px] left-1/2 -translate-x-1/2' : ''}
                            ${position === 'left' ? 'right-[-3px] top-1/2 -translate-y-1/2' : ''}
                            ${position === 'right' ? 'left-[-3px] top-1/2 -translate-y-1/2' : ''}
                        `}
                    />
                </div>
            )}
        </div>
    );
};
