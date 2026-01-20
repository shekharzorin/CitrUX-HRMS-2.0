import React, { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    disabled,
    ...props
}) => {
    const baseClasses = 'btn';

    const variantClasses = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        danger: 'btn-danger',
        ghost: 'btn-ghost',
        outline: 'btn-outline',
        success: 'btn-success',
    };

    const sizeClasses = {
        sm: 'text-xs px-3 py-1.5 rounded-[var(--radius-sm)]',
        md: 'text-sm px-4 py-2 rounded-[var(--radius-md)]',
        lg: 'text-base px-6 py-3 rounded-[var(--radius-lg)]',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className} ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
        </button>
    );
};
