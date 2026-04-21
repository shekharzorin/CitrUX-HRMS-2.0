import React, { useState, useEffect } from 'react';

export const AppProgressBar: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const handleLoading = (e: Event) => {
            const customEvent = e as CustomEvent<{ loading: boolean }>;
            if (customEvent.detail !== undefined) {
                setIsLoading(customEvent.detail.loading);
            }
        };

        window.addEventListener('app:loading', handleLoading);
        return () => window.removeEventListener('app:loading', handleLoading);
    }, []);

    if (!isLoading) return null;

    return (
        <div className="fixed top-0 left-0 right-0 h-1 z-[9999] overflow-hidden pointer-events-none">
            <div className="w-full h-full bg-indigo-500 origin-left animate-indeterminate-bar shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
            <style>{`
                @keyframes indeterminate-bar {
                    0% { transform: translateX(-100%) scaleX(0.2); }
                    50% { transform: translateX(0%) scaleX(0.5); }
                    100% { transform: translateX(100%) scaleX(0.2); }
                }
                .animate-indeterminate-bar {
                    animation: indeterminate-bar 1.5s infinite linear;
                }
            `}</style>
        </div>
    );
};
