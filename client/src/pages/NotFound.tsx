import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui/Icons';
import { Button } from '../components/ui/Button';

const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <span className="text-4xl font-bold">404</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Page Not Found</h1>
            <p className="text-slate-500 mb-8 text-center max-w-md">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            <div className="flex gap-4">
                <Button onClick={() => navigate(-1)} variant="secondary">
                    <div className="flex items-center gap-2">
                        <Icon name="chevron_left" size={18} />
                        Go Back
                    </div>
                </Button>
                <Button onClick={() => navigate('/')}>
                    <div className="flex items-center gap-2">
                        <Icon name="dashboard" size={18} />
                        Back to Dashboard
                    </div>
                </Button>
            </div>
        </div>
    );
};

export default NotFound;
