import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { Icon } from '../components/ui/Icons';
import { PageHeader } from '../components/ui/PageHeader';

interface AttendanceRequest {
    id: string;
    date: string;
    clockIn: string;
    clockOut: string;
    reason: string;
    user: {
        id: string;
        email: string;
        employeeId: string;
        profile?: {
            firstName: string;
            lastName: string;
            designation: string;
        }
    };
}

const AttendanceApprovals: React.FC = () => {
    const [requests, setRequests] = useState<AttendanceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await api.get<AttendanceRequest[]>('/attendance/adjust/pending');
            setRequests(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        const comment = status === 'REJECTED' ? prompt("Rejection Reason:") : "Approved";
        if (status === 'REJECTED' && !comment) return;

        try {
            await api.post('/attendance/adjust/respond', { id, status, comment });
            showToast(`Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`, status === 'APPROVED' ? 'success' : 'info');
            fetchRequests();
        } catch (error: any) {
            showToast(error.message || "Action failed", "error");
        }
    };

    const safeDate = (d: string) => new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    const safeTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="page-container space-y-8">
            <PageHeader
                title="Attendance Approvals"
                subtitle="Review and process attendance adjustment requests from team members."
                icon="check_circle"
            />

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-400 mb-4">
                        <Icon name="check_circle" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">All Caught Up!</h3>
                    <p className="text-slate-500">No pending attendance adjustment requests.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {requests.map(req => (
                        <div key={req.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 animate-fade-in group hover:shadow-md transition-all">
                            <div className="flex-1">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                        {req.user.profile?.firstName?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{req.user.profile?.firstName} {req.user.profile?.lastName}</h4>
                                        <p className="text-xs text-slate-500 uppercase font-bold">{req.user.profile?.designation || 'Employee'}</p>
                                    </div>
                                    <div className="ml-auto text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">
                                        #{req.user.employeeId}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Date</div>
                                        <div className="font-bold text-slate-700">{safeDate(req.date)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Correct In</div>
                                        <div className="font-mono font-bold text-emerald-600">{safeTime(req.clockIn)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Correct Out</div>
                                        <div className="font-mono font-bold text-rose-600">{safeTime(req.clockOut)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Reason</div>
                                        <div className="text-sm text-slate-600 line-clamp-1" title={req.reason}>{req.reason}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-row md:flex-col justify-center gap-3 min-w-[140px]">
                                <button
                                    onClick={() => handleAction(req.id, 'APPROVED')}
                                    className="btn-success w-full justify-center"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleAction(req.id, 'REJECTED')}
                                    className="btn-outline border-rose-200 text-rose-600 hover:bg-rose-50 w-full justify-center"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AttendanceApprovals;
