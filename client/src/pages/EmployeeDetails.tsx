import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { Button } from '../components/ui/Button';

const EmployeeDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { token: _token } = useAuth(); // Token unused by api service but kept for context
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const data = await api.get<any>(`/users/${id}`);
                if (data) {
                    setEmployee(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployee();
    }, [id]);

    if (loading) return <div className="p-8 text-center text-slate-500">Loading profile...</div>;
    if (!employee) return <div className="p-8 text-center text-slate-500">Employee not found</div>;

    const { profile, onboarding, salary, attendance, leaveBalances } = employee;

    // Parse bank details safely
    let bankDetails: any = {};
    if (onboarding?.bankDetails) {
        try { bankDetails = JSON.parse(onboarding.bankDetails); } catch { }
    }

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'personal', label: 'Personal & Docs' },
        { id: 'financial', label: 'Financial' },
        { id: 'attendance', label: 'Attendance & Leaves' }
    ];

    // Memoized style to avoid inline object lints and redundant parses
    // Memoized settings parsing
    const photoSettings = React.useMemo(() => {
        if (!profile?.profilePhotoSettings) return null;
        try {
            return typeof profile.profilePhotoSettings === 'string'
                ? JSON.parse(profile.profilePhotoSettings)
                : profile.profilePhotoSettings;
        } catch (e) {
            return null;
        }
    }, [profile?.profilePhotoSettings]);

    const setPhotoRef = (el: HTMLImageElement | null) => {
        if (!el) return;
        if (photoSettings) {
            el.style.setProperty('--zoom', String(photoSettings.zoom || 1));
            el.style.setProperty('--x', (photoSettings.x || 0) + '%');
            el.style.setProperty('--y', (photoSettings.y || 0) + '%');
        }
    };

    return (
        <div className="page-container">
            {/* Header Profile Card */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 mb-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-50 rounded-full blur-3xl opacity-50 -mr-32 -mt-32"></div>

                <div className="w-32 h-32 rounded-3xl bg-slate-100 flex items-center justify-center text-4xl font-bold text-slate-600 border-4 border-white shadow-xl overflow-hidden relative z-10">
                    {profile?.profilePhoto ? (
                        <img
                            src={profile.profilePhoto}
                            alt="Profile"
                            className="w-full h-full object-cover profile-photo-dynamic"
                            ref={setPhotoRef}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white">
                            {(profile?.firstName?.charAt(0) || '') + (profile?.lastName?.charAt(0) || '')}
                        </div>
                    )}
                </div>
                <div className="flex-1 text-center md:text-left relative z-10">
                    <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{profile?.firstName} {profile?.lastName}</h1>
                    <div className="flex items-center justify-center md:justify-start gap-4 mb-6">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                            <Icon name="onboarding" size={14} className="text-[var(--primary)]" />
                            {profile?.designation}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                            <Icon name="notifications" size={14} className="text-blue-500" />
                            {employee.email}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                        <span className="px-4 py-1.5 rounded-2xl bg-fuchsia-50 text-fuchsia-700 text-xs font-black uppercase tracking-widest border border-fuchsia-100 shadow-sm">
                            {employee.role}
                        </span>
                        <span className={`px-4 py-1.5 rounded-2xl text-xs font-black uppercase tracking-widest border shadow-sm ${employee.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {employee.status}
                        </span>
                    </div>
                </div>
                <div className="relative z-10">
                    <Link to={`/users/edit/${id}`}>
                        <Button variant="secondary" className="px-6 h-12 shadow-sm">
                            <Icon name="edit" size={18} /> Edit Profile
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            {/* Tabs */}
            <div className="flex gap-2 mb-8 border-b border-slate-200 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-3 px-6 font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id
                            ? 'border-[var(--primary)] text-[var(--primary)]'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px]">

                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Basic Information</h3>
                            <div className="space-y-4">
                                <InfoRow label="Employee Name" value={`${profile?.firstName} ${profile?.lastName}`} />
                                <InfoRow label="Email Address" value={employee.email} />
                                <InfoRow label="Phone" value={profile?.phone || 'Not Provided'} />
                                <InfoRow label="Designation" value={profile?.designation || 'Not Provided'} />
                                <InfoRow label="Date of Joining" value={profile?.dateOfJoining ? new Date(profile.dateOfJoining).toLocaleDateString() : 'N/A'} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Emergency Contact</h3>
                            <div className="space-y-4">
                                <InfoRow label="Contact Name" value={profile?.emergencyContact || 'Not Provided'} />
                                <InfoRow label="Address" value={profile?.address || 'Not Provided'} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'personal' && (
                    <div>
                        {onboarding ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Personal Details</h3>
                                    <div className="space-y-4">
                                        <InfoRow label="Father's Name" value={onboarding.fatherName} />
                                        <InfoRow label="Date of Birth" value={onboarding.dateOfBirth ? new Date(onboarding.dateOfBirth).toLocaleDateString() : 'N/A'} />
                                        <InfoRow label="Current Address" value={onboarding.currAddress} />
                                        <InfoRow label="Permanent Address" value={onboarding.permAddress} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Identity & Documents</h3>
                                    <div className="space-y-4">
                                        <InfoRow label="Aadhaar Number" value={onboarding.aadhaarNumber} />
                                        <InfoRow label="PAN Number" value={onboarding.panNumber} />

                                        <div className="pt-4 grid grid-cols-2 gap-4">
                                            <DocLink url={onboarding.aadhaarUrl} label="Aadhaar Card" />
                                            <DocLink url={onboarding.panUrl} label="PAN Card" />
                                            <DocLink url={onboarding.offerLetterUrl} label="Signed Offer Letter" />
                                            <DocLink url={onboarding.passbookUrl} label="Bank Passbook" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 text-slate-400">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                                    <Icon name="onboarding" size={32} />
                                </div>
                                <p className="font-bold">Onboarding has not been completed.</p>
                                <p className="text-sm">Please follow up with the employee to complete their profile.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Salary Structure</h3>
                            {salary ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                                        <span className="text-slate-600">Basic Salary</span>
                                        <span className="font-bold">₹{salary.basic.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between p-2">
                                        <span className="text-slate-600">HRA</span>
                                        <span className="font-bold">₹{salary.hra.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                                        <span className="text-slate-600">Allowances</span>
                                        <span className="font-bold">₹{salary.allowances.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between p-2 border-t pt-2 mt-2">
                                        <span className="text-slate-800 font-bold">Total CTC</span>
                                        <span className="font-bold text-green-600">₹{salary.ctc.toLocaleString()}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-400 italic">Salary structure not configured.</p>
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Bank Account</h3>
                            {onboarding?.bankDetails ? (
                                <div className="space-y-4">
                                    <InfoRow label="Bank Name" value={bankDetails.bankName} />
                                    <InfoRow label="Account Number" value={bankDetails.accountNumber} />
                                    <InfoRow label="IFSC Code" value={bankDetails.ifsc} />
                                </div>
                            ) : (
                                <p className="text-slate-400 italic">Bank details not available.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Recent Attendance</h3>
                            {attendance?.length > 0 ? (
                                <div className="space-y-2">
                                    {attendance.map((log: any) => (
                                        <div key={log.id} className="flex justify-between items-center p-3 border rounded-lg bg-slate-50">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700">{new Date(log.date).toDateString()}</span>
                                                <span className="text-xs text-slate-500">{log.status}</span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-green-600 font-mono">In: {log.checkIn ? new Date(log.checkIn).toLocaleTimeString() : '-'}</span>
                                                <br />
                                                <span className="text-red-600 font-mono">Out: {log.checkOut ? new Date(log.checkOut).toLocaleTimeString() : '-'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-400 italic">No recent attendance records.</p>
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Leave Balances</h3>
                            {leaveBalances?.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {leaveBalances.map((lb: any) => (
                                        <div key={lb.id} className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
                                            <div className="text-2xl font-bold text-blue-700">{lb.balance}</div>
                                            <div className="text-xs text-blue-500 uppercase font-semibold">{lb.type}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-400 italic">Leave balances not initialized.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper Components
const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-100 last:border-0">
        <span className="text-slate-500 text-sm font-medium">{label}</span>
        <span className="text-slate-800 font-medium">{value || '-'}</span>
    </div>
);

const DocLink = ({ url, label }: { url?: string, label: string }) => {
    if (!url) return null;
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-fuchsia-50 hover:border-fuchsia-200 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--primary)] shadow-sm group-hover:scale-110 transition-transform">
                <Icon name="eye" size={20} />
            </div>
            <div className="overflow-hidden">
                <div className="text-sm font-bold text-slate-700 group-hover:text-[var(--primary)] truncate">{label}</div>
                <div className="text-xs text-slate-400 font-medium">Click to view</div>
            </div>
        </a>
    );
};

export default EmployeeDetails;
