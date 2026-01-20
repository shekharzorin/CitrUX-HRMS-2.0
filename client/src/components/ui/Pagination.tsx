import React from 'react';
import { Icon } from './Icons';
import { Button } from './Button';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
    showPageNumbers?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    className = '',
    showPageNumbers = true
}) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 3; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 2; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div className={`flex items-center justify-center gap-2 ${className}`}>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-9 h-9 p-0"
                aria-label="Previous Page"
            >
                <Icon name="chevron_left" size={18} />
            </Button>

            {showPageNumbers && (
                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, idx) => (
                        <React.Fragment key={idx}>
                            {page === '...' ? (
                                <span className="text-[var(--text-muted)] text-xs px-1">...</span>
                            ) : (
                                <button
                                    onClick={() => onPageChange(page as number)}
                                    className={`
                                        w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] text-sm font-medium transition-all
                                        ${currentPage === page
                                            ? 'bg-[var(--primary)] text-white shadow-md'
                                            : 'bg-transparent text-[var(--text-main)] hover:bg-slate-100 dark:hover:bg-slate-800'}
                                    `}
                                >
                                    {page}
                                </button>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            )}

            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-9 h-9 p-0"
                aria-label="Next Page"
            >
                <Icon name="chevron_right" size={18} />
            </Button>
        </div>
    );
};
