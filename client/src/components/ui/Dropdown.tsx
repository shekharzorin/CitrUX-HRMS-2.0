import React, { useState, useRef, useEffect } from 'react';
import { Icon, type IconName } from './Icons';

interface DropdownItem {
    label: string;
    icon?: IconName;
    onClick: () => void;
    variant?: 'default' | 'danger';
}

interface DropdownProps {
    trigger: React.ReactNode;
    items: DropdownItem[];
    align?: 'left' | 'right';
    className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
    trigger,
    items,
    align = 'right',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative inline-block ${className}`} ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>

            {isOpen && (
                <div
                    className={`
                        absolute z-50 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-[var(--border-light)] transform opacity-100 scale-100 transition-all
                        ${align === 'right' ? 'right-0' : 'left-0'}
                    `}
                >
                    <div className="py-1">
                        {items.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    item.onClick();
                                    setIsOpen(false);
                                }}
                                className={`
                                    w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors
                                    ${item.variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-main)]'}
                                `}
                            >
                                {item.icon && <Icon name={item.icon} size={16} />}
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
