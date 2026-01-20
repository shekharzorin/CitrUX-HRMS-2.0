import React, { type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options?: string[] | { label: string; value: string | number }[];
    containerClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
    className = '',
    label,
    error,
    id,
    options = [],
    required,
    children,
    containerClassName = '',
    disabled,
    ...props
}) => {
    return (
        <div className={`w-full ${containerClassName}`}>
            {label && (
                <label htmlFor={id} className="form-label">
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            )}
            <div className="relative">
                <select
                    id={id}
                    required={required}
                    disabled={disabled}
                    className={`
                        input-field appearance-none w-full pr-10
                        ${error ? 'input-error' : ''} 
                        ${className}
                        ${disabled ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50' : ''}
                    `}
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
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>
            </div>
            {error && <p className="text-[var(--error)] text-xs mt-1 animate-slide-up">{error}</p>}
        </div>
    );
};
