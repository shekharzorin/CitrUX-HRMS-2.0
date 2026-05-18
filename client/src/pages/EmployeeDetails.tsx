import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { Icon } from '../components/ui/Icons';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { resolveImageUrl } from '../utils/image';

const EmployeeDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth(); // Token unused by api service but kept for context
    const { showToast } = useToast();
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [payrollInfo, setPayrollInfo] = useState<any>(null);
    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
    const [payrollForm, setPayrollForm] = useState<any>({});
    const [isIFSCValidating, setIsIFSCValidating] = useState(false);

    // Override State
    const [editingAttendance, setEditingAttendance] = useState<any>(null);
    const [overrideForm, setOverrideForm] = useState({ checkIn: '', checkOut: '', reason: '' });

    const openOverrideModal = (log: any) => {
        setEditingAttendance(log);
        // Format for input[type="time"]
        const toTime = (d: string) => {
            if (!d) return '';
            const date = new Date(d);
            return date.toTimeString().substring(0, 5); // HH:mm
        };
        setOverrideForm({
            checkIn: toTime(log.checkIn),
            checkOut: toTime(log.checkOut),
            reason: ''
        });
    };

    const handleOverrideSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/attendance/override', {
                userId: id,
                date: editingAttendance.date,
                checkIn: `${new Date(editingAttendance.date).toLocaleDateString()} ${overrideForm.checkIn}`,
                checkOut: overrideForm.checkOut ? `${new Date(editingAttendance.date).toLocaleDateString()} ${overrideForm.checkOut}` : null,
                reason: overrideForm.reason
            });
            showToast('Attendance updated successfully', 'success');
            setEditingAttendance(null);
            // Refresh logic
            const updated = await api.get<any>(`/users/${id}`);
            setEmployee(updated);
        } catch (error: any) {
            showToast(error.message || 'Update failed', 'error');
        }
    };

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
        const fetchPayroll = async () => {
            try {
                const data = await api.get<any>(`/payroll/info/${id}`);
                if (data) setPayrollInfo(data);
            } catch (error) {
                console.error('Error fetching payroll info', error);
            }
        };
        fetchEmployee();
        fetchPayroll();
    }, [id]);

    const handleIFSCBlur = async () => {
        if (!payrollForm.ifscCode || payrollForm.ifscCode.length !== 11) return;
        setIsIFSCValidating(true);
        try {
            const data = await api.get<any>(`/payroll/ifsc/${payrollForm.ifscCode}`);
            setPayrollForm((prev: any) => ({
                ...prev,
                bankName: data.bank,
                bankBranch: data.branch,
                bankAddress: data.address
            }));
            showToast('Bank details fetched successfully', 'success');
        } catch (error: any) {
            showToast('Invalid IFSC Code or fetch failed', 'error');
        } finally {
            setIsIFSCValidating(false);
        }
    };

    const handlePayrollSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/payroll/info/${id}`, payrollForm);
            showToast('Payroll info updated successfully', 'success');
            setIsPayrollModalOpen(false);
            // Refresh payroll data
            const data = await api.get<any>(`/payroll/info/${id}`);
            if (data) setPayrollInfo(data);
        } catch (error: any) {
            showToast(error.message || 'Update failed', 'error');
        }
    };

    const openPayrollModal = () => {
        setPayrollForm({
            bankName: payrollInfo?.profile?.bankName || '',
            accountNumber: payrollInfo?.profile?.accountNumber?.includes('*') ? '' : (payrollInfo?.profile?.accountNumber || ''),
            ifscCode: payrollInfo?.profile?.ifscCode || '',
            bankBranch: payrollInfo?.profile?.bankBranch || '',
            bankAddress: payrollInfo?.profile?.bankAddress || '',
            paymentMode: payrollInfo?.profile?.paymentMode || 'BANK_TRANSFER',
            uanNumber: payrollInfo?.profile?.uanNumber || '',
            basic: payrollInfo?.salary?.basic || 0,
            hra: payrollInfo?.salary?.hra || 0,
            da: payrollInfo?.salary?.da || 0,
            allowances: payrollInfo?.salary?.allowances || 0,
            pf: payrollInfo?.salary?.pf || 0,
            esi: payrollInfo?.salary?.esi || 0,
            professionalTax: payrollInfo?.salary?.professionalTax || 0,
            deductions: payrollInfo?.salary?.deductions || 0,
            ctc: payrollInfo?.salary?.ctc || 0,
        });
        setIsPayrollModalOpen(true);
    };

    // Safe destructuring (moved up for hook dependencies)
    const { profile = {}, onboarding = {}, attendance = [], leaveBalances = [] } = employee || {};

    // Memoized settings parsing (Moved up to avoid conditional hook execution error)
    const photoSettings = React.useMemo(() => {
        if (!profile?.profilePhotoSettings) return null;
        try {
            return typeof profile.profilePhotoSettings === 'string'
                ? JSON.parse(profile.profilePhotoSettings)
                : profile.profilePhotoSettings;
        } catch {
            return null;
        }
    }, [profile?.profilePhotoSettings]);

    if (loading) return <div className="p-8 text-center text-slate-500">Loading profile...</div>;
    if (!employee) return <div className="p-8 text-center text-slate-500">Employee not found</div>;

    // Helper for safe date formatting
    const formatDate = (dateString: any) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            return date.toLocaleDateString();
        } catch {
            return 'Error';
        }
    };

    // Helper for safe time formatting
    const formatTime = (dateString: any) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleTimeString();
        } catch {
            return '-';
        }
    };

    // Parse bank details safely (kept for legacy if needed, or remove if unused)

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'personal', label: 'Personal & Docs' },
        { id: 'financial', label: 'Financial' },
        { id: 'attendance', label: 'Attendance & Leaves' }
    ];

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
                            src={resolveImageUrl(profile.profilePhoto)}
                            alt="Profile"
                            className="w-full h-full object-cover profile-photo-dynamic"
                            ref={setPhotoRef}
                            onError={(e) => {
                                // Fallback if image fails to load
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white">
                            {(profile?.firstName?.charAt(0) || '') + (profile?.lastName?.charAt(0) || '')}
                        </div>
                    )}
                </div>
                <div className="flex-1 text-center md:text-left relative z-10">
                    <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
                        {profile?.firstName || 'Unknown'} {profile?.lastName || ''}
                    </h1>
                    <div className="flex items-center justify-center md:justify-start gap-4 mb-6">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                            <Icon name="onboarding" size={14} className="text-[var(--primary)]" />
                            {profile?.designation || 'No Designation'}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                            <Icon name="notifications" size={14} className="text-blue-500" />
                            {employee?.email || 'No Email'}
                        </div>
                        {profile?.branch?.name && (
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                📍 {profile.branch.name}
                            </div>
                        )}
                        {profile?.departmentRef?.name && (
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                🏢 {profile.departmentRef.name}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                        <span className="px-4 py-1.5 rounded-2xl bg-fuchsia-50 text-fuchsia-700 text-xs font-black uppercase tracking-widest border border-fuchsia-100 shadow-sm">
                            {employee?.role || 'EMPLOYEE'}
                        </span>
                        <span className={`px-4 py-1.5 rounded-2xl text-xs font-black uppercase tracking-widest border shadow-sm ${employee?.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {employee?.status || 'UNKNOWN'}
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
            <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
                variant="underline"
            />

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px]">

                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Basic Information</h3>
                            <div className="space-y-4">
                                <InfoRow label="Employee ID" value={employee?.employeeId || '-'} />
                                <InfoRow label="Email Address" value={employee?.email || '-'} />
                                <InfoRow label="Phone" value={profile?.phone || 'Not Provided'} />
                                <InfoRow label="Designation" value={profile?.designation || 'Not Provided'} />
                                <InfoRow label="Branch" value={profile?.branch?.name || 'Not Provided'} />
                                <InfoRow label="Department" value={profile?.departmentRef?.name || 'Not Provided'} />
                                <InfoRow label="Date of Joining" value={formatDate(profile?.dateOfJoining)} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Emergency Contact</h3>
                            <div className="space-y-4">
                                <InfoRow label="Contact Name" value={profile?.emergencyContactName || profile?.emergencyContact || 'Not Provided'} />
                                <InfoRow label="Relationship" value={profile?.emergencyContactRelation || '-'} />
                                <InfoRow label="Phone Number" value={profile?.emergencyContactPhone || '-'} />
                                <InfoRow label="Alternate Number" value={profile?.emergencyContactAlternate || '-'} />
                                <InfoRow label="Address" value={profile?.emergencyContactAddress || profile?.address || 'Not Provided'} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'personal' && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Personal Details</h3>
                                <div className="space-y-4">
                                    <InfoRow label="Date of Birth" value={formatDate(profile?.dob || onboarding?.dateOfBirth)} />
                                    <InfoRow label="Gender" value={profile?.gender || '-'} />
                                    <InfoRow label="Blood Group" value={profile?.bloodGroup || '-'} />
                                    <InfoRow label="Nationality" value={profile?.nationality || '-'} />
                                    <InfoRow label="Marital Status" value={profile?.maritalStatus || '-'} />
                                    <InfoRow label="Present Address" value={profile?.presentAddress || onboarding?.currAddress || '-'} />
                                    <InfoRow label="Permanent Address" value={profile?.permanentAddress || onboarding?.permAddress || '-'} />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Identity & Documents</h3>
                                <div className="space-y-4">
                                    <InfoRow label="Aadhaar Number" value={profile?.aadhaarNumber ? profile.aadhaarNumber.replace(/.(?=.{4})/g, 'X') : (onboarding?.aadhaarNumber ? onboarding.aadhaarNumber.replace(/.(?=.{4})/g, 'X') : '-')} />
                                    <InfoRow label="PAN Number" value={profile?.panNumber ? profile.panNumber.replace(/.(?=.{4})/g, 'X') : (onboarding?.panNumber ? onboarding.panNumber.replace(/.(?=.{4})/g, 'X') : '-')} />
                                    <InfoRow label="UAN Number" value={profile?.uanNumber || '-'} />

                                    <div className="pt-4 grid grid-cols-2 gap-4">
                                        <DocLink url={onboarding?.aadhaarUrl} label="Aadhaar Card" />
                                        <DocLink url={onboarding?.panUrl} label="PAN Card" />
                                        <DocLink url={onboarding?.offerLetterUrl} label="Signed Offer Letter" />
                                        <DocLink url={onboarding?.passbookUrl} label="Bank Passbook" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h3 className="text-xl font-bold text-slate-800">Payroll & Banking Information</h3>
                            {(user?.role === 'ADMIN' || user?.role === 'HR' || user?.id === id) && (
                                <Button variant="secondary" onClick={openPayrollModal}>
                                    <Icon name="edit" size={16} /> Edit Details
                                </Button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Salary Structure</h4>
                                {payrollInfo?.salary ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-between p-2 bg-slate-50 rounded">
                                            <span className="text-slate-600">Basic Salary</span>
                                            <span className="font-bold">₹{(payrollInfo.salary.basic || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between p-2">
                                            <span className="text-slate-600">HRA</span>
                                            <span className="font-bold">₹{(payrollInfo.salary.hra || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between p-2 bg-slate-50 rounded">
                                            <span className="text-slate-600">Allowances</span>
                                            <span className="font-bold">₹{(payrollInfo.salary.allowances || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between p-2">
                                            <span className="text-slate-600">PF</span>
                                            <span className="font-bold text-red-500">₹{(payrollInfo.salary.pf || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between p-2 bg-slate-50 rounded">
                                            <span className="text-slate-600">ESI</span>
                                            <span className="font-bold text-red-500">₹{(payrollInfo.salary.esi || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between p-2 border-t pt-2 mt-2">
                                            <span className="text-slate-800 font-bold">Total CTC</span>
                                            <span className="font-bold text-green-600">₹{(payrollInfo.salary.ctc || 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-400 italic">Salary structure not configured or restricted access.</p>
                                )}
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Bank Account</h4>
                                {payrollInfo?.profile ? (
                                    <div className="space-y-4">
                                        <InfoRow label="Bank Name" value={payrollInfo.profile.bankName} />
                                        <InfoRow label="Account Number" value={payrollInfo.profile.accountNumber} />
                                        <InfoRow label="IFSC Code" value={payrollInfo.profile.ifscCode} />
                                        <InfoRow label="Branch Name" value={payrollInfo.profile.bankBranch} />
                                        <InfoRow label="Bank Address" value={payrollInfo.profile.bankAddress} />
                                        <InfoRow label="Payment Mode" value={payrollInfo.profile.paymentMode} />
                                        <InfoRow label="UAN" value={payrollInfo.profile.uanNumber} />
                                    </div>
                                ) : (
                                    <p className="text-slate-400 italic">Bank details not available.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Recent Attendance</h3>
                            {Array.isArray(attendance) && attendance.length > 0 ? (
                                <div className="space-y-2">
                                    {attendance.map((log: any) => (
                                        <div key={log?.id || Math.random()} className="flex justify-between items-center p-3 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700">{formatDate(log?.date)}</span>
                                                <span className="text-xs text-slate-500">{log?.status}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-sm text-right">
                                                    <span className="text-green-600 font-mono">In: {formatTime(log?.checkIn)}</span>
                                                    <br />
                                                    <span className="text-red-600 font-mono">Out: {formatTime(log?.checkOut)}</span>
                                                    {(log?.hours || 0) > 0 && <div className="text-xs text-slate-400 mt-1 font-bold">{(log?.hours || 0).toFixed(1)} hrs</div>}
                                                </div>
                                                {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                                                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => openOverrideModal(log)} title="Edit Attendance">
                                                        <Icon name="edit" size={16} />
                                                    </Button>
                                                )}
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
                            {Array.isArray(leaveBalances) && leaveBalances.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {leaveBalances.map((lb: any) => (
                                        <div key={lb?.id || Math.random()} className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
                                            <div className="text-2xl font-bold text-blue-700">{lb?.balance || 0}</div>
                                            <div className="text-xs text-blue-500 uppercase font-semibold">{lb?.type || 'LEAVE'}</div>
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
            {/* Override Modal */}
            {editingAttendance && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold">Edit Attendance: {formatDate(editingAttendance.date)}</h3>
                            <button onClick={() => setEditingAttendance(null)} aria-label="Close Modal"><Icon name="close" size={20} /></button>
                        </div>
                        <form onSubmit={handleOverrideSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label" htmlFor="overrideCheckIn">Check In</label>
                                    <input id="overrideCheckIn" type="time" required className="input-field"
                                        value={overrideForm.checkIn}
                                        onChange={e => setOverrideForm({ ...overrideForm, checkIn: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label" htmlFor="overrideCheckOut">Check Out</label>
                                    <input id="overrideCheckOut" type="time" className="input-field"
                                        value={overrideForm.checkOut}
                                        onChange={e => setOverrideForm({ ...overrideForm, checkOut: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label" htmlFor="overrideReason">Reason (Mandatory for Audit)</label>
                                <textarea id="overrideReason" required className="input-field" rows={2}
                                    value={overrideForm.reason}
                                    onChange={e => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                                    placeholder="Explain why you are changing this record..."
                                ></textarea>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <Button variant="ghost" type="button" onClick={() => setEditingAttendance(null)}>Cancel</Button>
                                <Button variant="primary" type="submit">Save Changes</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Payroll Modal */}
            {isPayrollModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg">Edit Payroll & Banking Details</h3>
                            <button onClick={() => setIsPayrollModalOpen(false)} aria-label="Close Modal"><Icon name="close" size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="payrollForm" onSubmit={handlePayrollSubmit} className="space-y-8">
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Bank Details Section */}
                                    <div>
                                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                                            <Icon name="payroll" size={18} /> Bank Details
                                        </h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="label" htmlFor="ifscCode">IFSC Code</label>
                                                <div className="flex gap-2">
                                                    <input id="ifscCode" className="input-field uppercase font-mono" value={payrollForm.ifscCode} onChange={e => setPayrollForm({...payrollForm, ifscCode: e.target.value.toUpperCase()})} onBlur={handleIFSCBlur} placeholder="11 digit IFSC" maxLength={11} required />
                                                    {isIFSCValidating && <div className="flex items-center text-xs text-blue-500"><Icon name="refresh" className="animate-spin" /></div>}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="label" htmlFor="bankName">Bank Name</label>
                                                <input id="bankName" className="input-field" value={payrollForm.bankName} onChange={e => setPayrollForm({...payrollForm, bankName: e.target.value})} required />
                                            </div>
                                            <div>
                                                <label className="label" htmlFor="accountNumber">Account Number</label>
                                                <input id="accountNumber" className="input-field font-mono tracking-widest" value={payrollForm.accountNumber} onChange={e => setPayrollForm({...payrollForm, accountNumber: e.target.value})} required type="password" />
                                            </div>
                                            <div>
                                                <label className="label" htmlFor="bankBranch">Branch Name</label>
                                                <input id="bankBranch" className="input-field" value={payrollForm.bankBranch} onChange={e => setPayrollForm({...payrollForm, bankBranch: e.target.value})} required />
                                            </div>
                                            <div>
                                                <label className="label" htmlFor="bankAddress">Bank Address</label>
                                                <textarea id="bankAddress" className="input-field" rows={2} value={payrollForm.bankAddress} onChange={e => setPayrollForm({...payrollForm, bankAddress: e.target.value})}></textarea>
                                            </div>
                                            <div>
                                                <label className="label" htmlFor="paymentMode">Payment Mode</label>
                                                <select id="paymentMode" className="input-field" value={payrollForm.paymentMode} onChange={e => setPayrollForm({...payrollForm, paymentMode: e.target.value})}>
                                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                                    <option value="CHEQUE">Cheque</option>
                                                    <option value="CASH">Cash</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label" htmlFor="uanNumber">UAN Number</label>
                                                <input id="uanNumber" className="input-field font-mono" value={payrollForm.uanNumber} onChange={e => setPayrollForm({...payrollForm, uanNumber: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Salary Details Section (Only Admins/HR) */}
                                    {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                                        <div>
                                            <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                                                <Icon name="payroll" size={18} /> Salary Structure
                                            </h4>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="label" htmlFor="basic">Basic Salary</label>
                                                        <input id="basic" type="number" className="input-field" value={payrollForm.basic} onChange={e => setPayrollForm({...payrollForm, basic: Number(e.target.value)})} />
                                                    </div>
                                                    <div>
                                                        <label className="label" htmlFor="hra">HRA</label>
                                                        <input id="hra" type="number" className="input-field" value={payrollForm.hra} onChange={e => setPayrollForm({...payrollForm, hra: Number(e.target.value)})} />
                                                    </div>
                                                    <div>
                                                        <label className="label" htmlFor="da">DA</label>
                                                        <input id="da" type="number" className="input-field" value={payrollForm.da} onChange={e => setPayrollForm({...payrollForm, da: Number(e.target.value)})} />
                                                    </div>
                                                    <div>
                                                        <label className="label" htmlFor="allowances">Allowances</label>
                                                        <input id="allowances" type="number" className="input-field" value={payrollForm.allowances} onChange={e => setPayrollForm({...payrollForm, allowances: Number(e.target.value)})} />
                                                    </div>
                                                    <div>
                                                        <label className="label" htmlFor="pf">PF</label>
                                                        <input id="pf" type="number" className="input-field" value={payrollForm.pf} onChange={e => setPayrollForm({...payrollForm, pf: Number(e.target.value)})} />
                                                    </div>
                                                    <div>
                                                        <label className="label" htmlFor="esi">ESI</label>
                                                        <input id="esi" type="number" className="input-field" value={payrollForm.esi} onChange={e => setPayrollForm({...payrollForm, esi: Number(e.target.value)})} />
                                                    </div>
                                                    <div>
                                                        <label className="label" htmlFor="professionalTax">Prof. Tax</label>
                                                        <input id="professionalTax" type="number" className="input-field" value={payrollForm.professionalTax} onChange={e => setPayrollForm({...payrollForm, professionalTax: Number(e.target.value)})} />
                                                    </div>
                                                    <div>
                                                        <label className="label" htmlFor="ctc">Total CTC</label>
                                                        <input id="ctc" type="number" className="input-field bg-emerald-50 font-bold" value={payrollForm.ctc} onChange={e => setPayrollForm({...payrollForm, ctc: Number(e.target.value)})} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t bg-slate-50 flex justify-end gap-4">
                            <Button variant="ghost" type="button" onClick={() => setIsPayrollModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" type="submit" form="payrollForm">Save Payroll Details</Button>
                        </div>
                    </div>
                </div>
            )}
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
