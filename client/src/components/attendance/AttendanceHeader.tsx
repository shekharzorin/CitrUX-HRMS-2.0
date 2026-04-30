import React from 'react';
import { PageHeader } from '../ui/PageHeader';
import { Icon } from '../ui/Icons';

interface AttendanceHeaderProps {
    isSuperAdmin: boolean;
    onRequestAdjustment: () => void;
}

export const AttendanceHeader: React.FC<AttendanceHeaderProps> = ({ isSuperAdmin, onRequestAdjustment }) => {
    return (
        <PageHeader
            title="My Attendance"
            subtitle="Track daily work hours, breaks, and attendance history."
            icon="attendance"
            gradient="gradient-purple"
            actions={
                {!isSuperAdmin && (
                    <button
                        onClick={onRequestAdjustment}
                        className="px-6 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl backdrop-blur-md border border-white/30 transition-all flex items-center gap-2 shadow-lg"
                    >
                        <Icon name="plus" size={18} />
                        Request Adjustment
                    </button>
                )}
            }
        />
    );
};
