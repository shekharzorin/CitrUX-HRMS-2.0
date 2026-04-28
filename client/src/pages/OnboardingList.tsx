import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/ui/Icons';
import { FaCheck, FaTimes, FaChevronDown, FaChevronUp, FaExternalLinkAlt, FaUserTie, FaBuilding, FaMapMarkerAlt, FaFileAlt } from 'react-icons/fa';
import { resolveImageUrl } from '../utils/image';

const OnboardingList: React.FC = () => {
    const { token } = useAuth();
    const [onboardings, setOnboardings] = useState<any[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchOnboardings = async () => {
        setLoading(true);
        try {
            const data = await api.get<any[]>('/onboarding/pending');
            setOnboardings(data || []);
        } catch (error) { console.error(error); }
        setLoading(false);
    };

    useEffect(() => {
        const init = async () => { await fetchOnboardings(); };
        init();
    }, []);

    const handleReject = async (id: string) => {
        const reason = window.prompt("Enter reason for rejection:");
        if (reason === null) return; // Cancelled

        try {
            await api.put(`/onboarding/${id}/reject`, { reason });
            fetchOnboardings();
        } catch (error) { console.error(error); }
    };

    const handleApprove = async (id: string) => {
        if (!window.confirm('Confirm approval? This will generate the employee profile.')) return;
        try {
            await api.put(`/onboarding/${id}/approve`, {});
            fetchOnboardings();
        } catch (error) { console.error(error); }
    };

    return (
        <div className="onboarding-container p-4 sm:p-8">
            <div className="mb-10">
                <h1 className="text-3xl font-extrabold text-[var(--text-main)] mb-2 tracking-tight">Onboarding Approvals</h1>
                <p className="text-[var(--text-muted)]">Review and approve pending employee registrations.</p>
            </div>

            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-20 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)]">
                        <div className="animate-spin w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-[var(--text-muted)] font-bold">Loading pending approvals...</p>
                    </div>
                ) : onboardings.length === 0 ? (
                    <div className="text-center py-20 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] border-dashed">
                        <div className="w-20 h-20 bg-[var(--bg-body)] text-[var(--text-muted)] rounded-full flex items-center justify-center mx-auto mb-6">
                            <Icon name="onboarding" size={40} strokeWidth={1} />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Queue is Clear!</h3>
                        <p className="text-[var(--text-muted)]">No pending onboarding applications at the moment.</p>
                    </div>
                ) : (
                    onboardings.map(o => (
                        <div key={o.id} className="onboarding-list-card">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-white bg-[var(--bg-body)] flex-shrink-0">
                                        {o.profilePhoto ? (
                                            <img src={resolveImageUrl(o.profilePhoto)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                                                <FaUserTie size={28} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                                            {o.fullName || 'Candidate'}
                                            <span className="onboarding-stat-badge bg-blue-100 text-blue-700">Pending</span>
                                        </h3>
                                        <p className="onboarding-email">{o.user?.email}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                            <span className="flex items-center gap-1"><FaBuilding size={10} /> {o.department || 'N/A'}</span>
                                            <span className="flex items-center gap-1"><FaMapMarkerAlt size={10} /> {o.workLocation || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full lg:w-auto">
                                    <button
                                        onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                                        className="onboarding-toggle-btn flex-1 lg:flex-none flex items-center justify-center gap-2 h-12"
                                    >
                                        {expandedId === o.id ? <><FaChevronUp size={12} /> Hide Details</> : <><FaChevronDown size={12} /> View Details</>}
                                    </button>
                                    <button
                                        onClick={() => handleReject(o.id)}
                                        className="h-12 px-6 bg-rose-100 text-rose-700 font-bold rounded-2xl hover:bg-rose-200 active:scale-95 transition-all flex-1 lg:flex-none flex items-center justify-center gap-2"
                                    >
                                        <FaTimes size={14} /> Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(o.id)}
                                        className="h-12 px-8 bg-[var(--primary)] text-white font-bold rounded-2xl shadow-xl shadow-purple-200 hover:scale-105 active:scale-95 transition-all flex-1 lg:flex-none flex items-center justify-center gap-2"
                                    >
                                        <FaCheck size={14} /> Approve
                                    </button>
                                </div>
                            </div>

                            {expandedId === o.id && (
                                <div className="mt-8 pt-8 border-t border-[var(--border-color)] animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-[0.2em] mb-4">Personal Details</h4>
                                            <div className="space-y-3">
                                                <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                                                    <span className="text-xs text-[var(--text-muted)]">DOB</span>
                                                    <span className="text-xs font-bold">{o.dateOfBirth?.split('T')[0] || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                                                    <span className="text-xs text-[var(--text-muted)]">Gender</span>
                                                    <span className="text-xs font-bold">{o.gender || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                                                    <span className="text-xs text-[var(--text-muted)]">Blood Group</span>
                                                    <span className="text-xs font-bold">{o.bloodGroup || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-[0.2em] mb-4">Professional</h4>
                                            <div className="space-y-3">
                                                <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                                                    <span className="text-xs text-[var(--text-muted)]">Designation</span>
                                                    <span className="text-xs font-bold">{o.designation || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                                                    <span className="text-xs text-[var(--text-muted)]">Join Date</span>
                                                    <span className="text-xs font-bold">{o.dateOfJoining?.split('T')[0] || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                                                    <span className="text-xs text-[var(--text-muted)]">PAN Number</span>
                                                    <span className="text-xs font-bold font-mono">{o.panNumber || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-[0.2em] mb-4">Uploaded Documents</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {o.documents && o.documents.length > 0 ? o.documents.map((d: any, idx: number) => (
                                                    <a
                                                        key={idx}
                                                        href={resolveImageUrl(d.url)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-2 p-3 bg-[var(--bg-body)] rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"
                                                    >
                                                        <FaFileAlt size={12} className="shrink-0" />
                                                        <span className="text-[10px] font-bold uppercase truncate">{d.type.replace('_', ' ')}</span>
                                                        <FaExternalLinkAlt size={8} className="ml-auto opacity-50" />
                                                    </a>
                                                )) : (
                                                    <p className="text-xs text-[var(--text-muted)] italic col-span-2">No documents uploaded.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {o.experiences && o.experiences.length > 0 && (
                                        <div className="mt-8">
                                            <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-[0.2em] mb-4">Work History</h4>
                                            <div className="space-y-3">
                                                {o.experiences.map((exp: any, idx: number) => (
                                                    <div key={idx} className="p-4 bg-[var(--bg-body)] rounded-2xl border border-[var(--border-color)] flex justify-between items-center">
                                                        <div>
                                                            <p className="text-sm font-bold text-[var(--text-main)]">{exp.designation}</p>
                                                            <p className="text-xs text-[var(--text-muted)]">{exp.companyName}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs font-bold text-[var(--text-muted)]">
                                                                {exp.startDate?.split('T')[0]} — {exp.endDate?.split('T')[0] || 'Present'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default OnboardingList;
