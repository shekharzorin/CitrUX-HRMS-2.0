import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const EmployeeDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { token } = useAuth();
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/users/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setEmployee(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployee();
    }, [id, token]);

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

    return (
        <div className="page-container">
            {/* Header Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-3xl font-bold text-slate-600 border-4 border-white shadow-lg">
                    {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-2xl font-bold text-slate-800 mb-1">{profile?.firstName} {profile?.lastName}</h1>
                    <p className="text-slate-500 font-medium mb-4">{profile?.designation} • {employee.email}</p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold border border-blue-100">
                            {employee.role}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${employee.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {employee.status}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <Link to={`/users/edit/${id}`} className="btn-primary bg-white text-slate-700 border border-slate-300 hover:bg-slate-50">
                        ✏️ Edit Profile
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-lg px-4 pt-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
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
                            <div className="text-center py-10 text-slate-400">
                                <div className="text-4xl mb-3">📄</div>
                                <p>Onboarding has not been completed for this employee yet.</p>
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
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
            <span className="text-2xl">📄</span>
            <div className="overflow-hidden">
                <div className="text-sm font-medium text-slate-700 group-hover:text-blue-700 truncate">{label}</div>
                <div className="text-xs text-slate-400">Click to view</div>
            </div>
        </a>
    );
};

export default EmployeeDetails;
