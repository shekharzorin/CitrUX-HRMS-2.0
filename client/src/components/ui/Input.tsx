import React, { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
    className = '',
    label,
    error,
    id,
    required,
    leftIcon,
    rightIcon,
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
                {leftIcon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-light)]">
                        {leftIcon}
                    </div>
                )}
                <input
                    id={id}
                    required={required}
                    disabled={disabled}
                    className={`
                        input-field 
                        ${leftIcon ? 'pl-10' : ''} 
                        ${rightIcon ? 'pr-10' : ''} 
                        ${error ? 'input-error' : ''} 
                        ${className}
                    `}
                    {...props}
                />
                {rightIcon && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[var(--text-light)]">
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && <p className="text-[var(--error)] text-xs mt-1 animate-slide-up">{error}</p>}
        </div>
    );
};
