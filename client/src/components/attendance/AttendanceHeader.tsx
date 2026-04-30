import React from 'react';
import { PageHeader } from '../ui/PageHeader';
import { Icon } from '../ui/Icons';

interface AttendanceHeaderProps {
    isSuperAdmin: boolean;
    onRequestAdjustment: () => void;
}

export const AttendanceHeader: React.FC<AttendanceHeaderProps> = ({ isSuperAdmin, onRequestAdjustment }) => {
    return (
        <div className="flex justify-between items-start">
            <PageHeader
                title="My Attendance"
                subtitle="Track daily work hours, breaks, and attendance."
                icon="attendance"
            />
            {!isSuperAdmin && (
                <button
                    onClick={onRequestAdjustment}
                    className="btn-outline flex items-center gap-2"
                >
                    <Icon name="edit" size={16} /> Request Adjustment
                </button>
            )}
        </div>
    );
};
