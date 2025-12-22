import React, { type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options?: string[] | { label: string; value: string | number }[];
}

export const Select: React.FC<SelectProps> = ({
    className = '',
    label,
    error,
    id,
    options = [],
    required,
    children,
    ...props
}) => {
    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-[var(--text-main)] mb-1">
                    {label} {required && <span className="text-[var(--error)]">*</span>}
                </label>
            )}
            <div className="relative">
                <select
                    id={id}
                    required={required}
                    className={`input-field appearance-none w-full ${error ? 'border-[var(--error)] focus:border-[var(--error)]' : ''} ${className}`}
                    {...props}
                >
                    {children ? children : (
                        <>
                            <option value="">Select Option</option>
                            {options.map((opt) => {
                                if (typeof opt === 'string') {
                                    return <option key={opt} value={opt}>{opt}</option>
                                }
                                return <option key={opt.value} value={opt.value}>{opt.label}</option>
                            })}
                        </>
                    )}
                </select>
                {/* Chevron Icon */}
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-[var(--text-muted)]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
            {error && <p className="text-[var(--error)] text-xs mt-1">{error}</p>}
        </div>
    );
};
