import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface AvatarProps {
    size?: string;
    fontSize?: string;
    className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ size = '32px', fontSize = '0.75rem', className = '' }) => {
    const { user } = useAuth();

    const getInitials = () => {
        if (!user) return '?';
        const firstName = user.profile?.firstName || '';
        const lastName = user.profile?.lastName || '';
        if (firstName && lastName) {
            return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
        }
        return (user.profile?.firstName?.charAt(0) || user.email[0]).toUpperCase();
    };

    const photo = user?.profile?.profilePhoto;
    const settings = typeof user?.profile?.profilePhotoSettings === 'string'
        ? JSON.parse(user.profile.profilePhotoSettings)
        : user?.profile?.profilePhotoSettings;

    if (photo) {
        let transform = `scale(${settings?.zoom || 1}) translate(${settings?.x || 0}%, ${settings?.y || 0}%)`;

        if (settings?.croppedAreaPixels) {
            const { x, y, width } = settings.croppedAreaPixels;
            const scale = 100 / width;
            transform = `scale(${scale}) translate(${-x}px, ${-y}px)`;
        }

        return (
            <div className={`avatar-container relative overflow-hidden rounded-full border border-slate-200 ${className}`} style={{ '--avatar-size': size, '--avatar-transform': transform } as React.CSSProperties}>
                <img
                    src={photo}
                    alt="Avatar"
                    className="avatar-img w-full h-full object-cover"
                />
                <style>{`
                    .avatar-container {
                        width: var(--avatar-size);
                        height: var(--avatar-size);
                    }
                    .avatar-img {
                        transform: var(--avatar-transform);
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div
            className={`avatar-placeholder flex items-center justify-center bg-blue-600 text-white font-bold rounded-full ${className}`}
            style={{ '--avatar-size': size, '--avatar-font-size': fontSize } as React.CSSProperties}
        >
            <style>{`
                .avatar-placeholder {
                    width: var(--avatar-size);
                    height: var(--avatar-size);
                    font-size: var(--avatar-font-size);
                }
            `}</style>
            {getInitials()}
        </div>
    );
};
