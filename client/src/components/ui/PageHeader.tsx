import { useNavigate } from 'react-router-dom';
import { Icon } from './Icons';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: string;
    gradient?: string;
    actions?: React.ReactNode;
    showBack?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    icon = 'dashboard',
    gradient = 'gradient-purple',
    actions,
    showBack = false
}) => {
    const navigate = useNavigate();
    return (
        <div className={`page-hero-premium ${gradient}`}>
            <div className="page-hero-pattern"></div>
            <div className="page-hero-content">
                <div className="flex items-center gap-6">
                    {showBack && (
                        <button
                            onClick={() => navigate(-1)}
                            className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors mr-2 backdrop-blur-sm"
                            title="Go Back"
                        >
                            <Icon name="chevron_left" size={20} />
                        </button>
                    )}
                    <div className="page-hero-icon glassy-icon-base">
                        <Icon name={icon as any} size={32} />
                    </div>
                    <div className="flex-1">
                        <h1 className="page-hero-title">{title}</h1>
                        {subtitle && <p className="page-hero-subtitle">{subtitle}</p>}
                    </div>
                </div>
                {actions && <div className="page-hero-actions">{actions}</div>}
            </div>
        </div>
    );
};
