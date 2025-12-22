import React, { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({
    className = '',
    label,
    error,
    id,
    required,
    ...props
}) => {
    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-[var(--text-main)] mb-1">
                    {label} {required && <span className="text-[var(--error)]">*</span>}
                </label>
            )}
            <input
                id={id}
                required={required}
                className={`input-field ${error ? 'border-[var(--error)] focus:border-[var(--error)]' : ''} ${className}`}
                {...props}
            />
            {error && <p className="text-[var(--error)] text-xs mt-1">{error}</p>}
        </div>
    );
};
