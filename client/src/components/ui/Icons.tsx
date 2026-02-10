import React from 'react';

export type AppIconName =
    | 'dashboard'
    | 'employees'
    | 'attendance'
    | 'leaves'
    | 'payroll'
    | 'holidays'
    | 'reports'
    | 'settings'
    | 'profile'
    | 'notifications'
    | 'onboarding'
    | 'roles'
    | 'departments'
    | 'timesheet'
    | 'offboarding'
    | 'performance'
    | 'careers'
    | 'expenses'
    | 'assets'
    | 'team_leaves'
    | 'org_chart'
    | 'approvals'
    | 'certificates'
    | 'reviews'
    | 'ats'
    | 'exp_approvals'
    | 'inventory'
    | 'shifts'
    | 'analytics'
    | 'logout'
    | 'arrow_down'
    | 'light_mode'
    | 'dark_mode'
    | 'chevron_left'
    | 'chevron_right'
    | 'menu'
    | 'close'
    | 'schedule'
    | 'bolt'
    | 'event'
    | 'arrow_forward'
    | 'campaign'
    | 'check_circle'
    | 'trending_up'
    | 'save'
    | 'upload'
    | 'plus'
    | 'minus'
    | 'search'
    | 'delete'
    | 'edit'
    | 'eye'
    | 'download'
    | 'play'
    | 'pause'
    | 'copy'
    | 'send'
    | 'rotate_ccw'
    | 'file_text'
    | 'more_horizontal'
    | 'info'
    | 'warning'
    | 'alert'
    | 'login'
    | 'refresh';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: AppIconName;
    size?: number | string;
}

/**
 * HRMS Custom Icon Set
 * Professional, clean, and consistent outline icons.
 */
export const Icon: React.FC<IconProps> = ({ name, size = 24, className = '', ...props }) => {
    const getIconPath = () => {
        switch (name) {
            case 'dashboard':
                return (
                    <>
                        <rect x="3" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="14" width="7" height="7" rx="1.5" />
                        <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    </>
                );
            case 'employees':
                return (
                    <>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </>
                );

            case 'more_horizontal':
                return (
                    <>
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                        <circle cx="5" cy="12" r="1" />
                    </>
                );
            case 'attendance':
                return (
                    <>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </>
                );
            case 'leaves':
                return (
                    <>
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="15 3 15 8 20 8" />
                        <path d="M12 18l3-3-3-3" />
                        <line x1="15" y1="15" x2="9" y2="15" />
                    </>
                );
            case 'payroll':
                return (
                    <>
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                        <path d="M7 15h.01" />
                        <path d="M11 15h.01" />
                    </>
                );
            case 'holidays':
                return (
                    <>
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </>
                );
            case 'reports':
                return (
                    <>
                        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                        <path d="M22 12A10 10 0 0 0 12 2v10z" />
                    </>
                );
            case 'settings':
                return (
                    <>
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </>
                );
            case 'profile':
                return (
                    <>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </>
                );
            case 'notifications':
                return (
                    <>
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </>
                );
            case 'onboarding':
                return (
                    <>
                        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.71-2.12.01-2.99l-.01-.01c-.87-.7-2.15-.7-2.99-.01z" />
                        <path d="M13 11l-4 4" />
                        <path d="M13 3l3.25 3.25L21 11l-3.25 3.25L14.5 17.5l-3.25-3.25l-3.25-3.25L11 8z" />
                    </>
                );
            case 'roles':
                return (
                    <>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <circle cx="12" cy="11" r="3" />
                        <path d="M12 14v4" />
                    </>
                );
            case 'departments':
                return (
                    <>
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                        <line x1="9" y1="9" x2="15" y2="9" />
                        <line x1="9" y1="13" x2="15" y2="13" />
                        <line x1="9" y1="17" x2="15" y2="17" />
                        <line x1="12" y1="4" x2="12" y2="20" />
                    </>
                );
            case 'timesheet':
                return (
                    <>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                        <path d="M9 16l2 2 4-4" />
                    </>
                );
            case 'offboarding':
                return (
                    <>
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </>
                );
            case 'performance':
                return (
                    <>
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="6" />
                        <circle cx="12" cy="12" r="2" />
                    </>
                );
            case 'careers':
                return (
                    <>
                        <rect x="2" y="7" width="20" height="14" rx="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </>
                );
            case 'expenses':
                return (
                    <>
                        <path d="M12 1v22" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </>
                );
            case 'assets':
                return (
                    <>
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                    </>
                );
            case 'team_leaves':
                return (
                    <>
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                        <path d="M9 12h6" />
                        <path d="M9 16h6" />
                    </>
                );
            case 'org_chart':
                return (
                    <>
                        <rect x="9" y="3" width="6" height="4" rx="1" />
                        <rect x="3" y="13" width="6" height="4" rx="1" />
                        <rect x="15" y="13" width="6" height="4" rx="1" />
                        <path d="M12 7v3a2 2 0 0 1-2 2H6v1" />
                        <path d="M12 12h6v1" />
                    </>
                );
            case 'approvals':
                return (
                    <>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <path d="M9 15l2 2 4-4" />
                    </>
                );
            case 'certificates':
                return (
                    <>
                        <path d="M12 15l-3-3 3-3 3 3-3 3z" />
                        <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.11" />
                        <path d="M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                    </>
                );
            case 'reviews':
                return (
                    <>
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </>
                );
            case 'ats':
                return (
                    <>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <line x1="10" y1="9" x2="8" y2="9" />
                    </>
                );
            case 'exp_approvals':
                return (
                    <>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M9 12l2 2 4-4" />
                    </>
                );
            case 'inventory':
                return (
                    <>
                        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                    </>
                );
            case 'shifts':
                return (
                    <>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 10" />
                    </>
                );
            case 'analytics':
                return (
                    <>
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                    </>
                );
            case 'logout':
                return (
                    <>
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </>
                );
            case 'arrow_down':
                return <polyline points="6 9 12 15 18 9" />;
            case 'light_mode':
                return (
                    <>
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </>
                );
            case 'dark_mode':
                return <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />;
            case 'chevron_left':
                return <polyline points="15 18 9 12 15 6" />;
            case 'chevron_right':
                return <polyline points="9 18 15 12 9 6" />;
            case 'menu':
                return (
                    <>
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </>
                );
            case 'close':
                return (
                    <>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </>
                );
            case 'schedule':
                return (
                    <>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </>
                );
            case 'bolt':
                return <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />;
            case 'event':
                return (
                    <>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </>
                );
            case 'arrow_forward':
                return <polyline points="9 18 15 12 9 6" />;
            case 'campaign':
                return (
                    <>
                        <path d="M18 8c0 4.5-3 6.5-3 6.5s-2-2-2-6.5c0-4.5 2-6.5 2-6.5s3 2 3 6.5z" />
                        <path d="M11 8c0 4.5-2 6.5-2 6.5s-2-2-2-6.5c0-4.5 2-6.5 2-6.5s2 2 2 6.5z" />
                        <path d="M13 19h-2a2 2 0 0 1-2-2v-1h6v1a2 2 0 0 1-2 2z" />
                    </>
                );
            case 'check_circle':
                return (
                    <>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </>
                );
            case 'trending_up':
                return <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />;
            case 'save':
                return (
                    <>
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                    </>
                );
            case 'upload':
                return (
                    <>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </>
                );
            case 'plus':
                return (
                    <>
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </>
                );
            case 'minus':
                return <line x1="5" y1="12" x2="19" y2="12" />;
            case 'search':
                return (
                    <>
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </>
                );
            case 'delete':
                return (
                    <>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                    </>
                );
            case 'edit':
                return (
                    <>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </>
                );
            case 'eye':
                return (
                    <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </>
                );
            case 'download':
                return (
                    <>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </>
                );
            case 'play':
                return <polygon points="5 3 19 12 5 21 5 3" />;
            case 'pause':
                return (
                    <>
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                    </>
                );
            case 'copy':
                return (
                    <>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </>
                );
            case 'send':
                return (
                    <>
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </>
                );
            case 'rotate_ccw':
                return (
                    <>
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <polyline points="3 3 3 8 8 8" />
                    </>
                );
            case 'file_text':
                return (
                    <>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <line x1="10" y1="9" x2="8" y2="9" />
                    </>
                );
            case 'info':
                return (
                    <>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </>
                );
            case 'warning':
                return (
                    <>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </>
                );
            case 'refresh':
                return <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />;
            case 'login':
                return (
                    <>
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                    </>
                );
            case 'alert':
                return (
                    <>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`lucide-icon ${className}`}
            {...props}
        >
            {getIconPath()}
        </svg>
    );
};
