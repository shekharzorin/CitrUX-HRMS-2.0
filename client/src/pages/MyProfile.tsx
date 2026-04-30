import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { Button } from '../components/ui/Button';
// import Cropper from 'react-easy-crop';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

import { useAttendanceWidget } from '../hooks/useAttendanceWidget';
import { resolveImageUrl } from '../utils/image';

const MyProfile: React.FC = () => {
    const { user, updateUser } = useAuth();
    const { clockedIn, workDuration, clockingLoading, handleClockIn, handleClockOut } = useAttendanceWidget();

    const [profile, setProfile] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('general');
    const [form, setForm] = useState({
        phone: '',
        address: '',
        emergencyContact: '',
        profilePhoto: '',
        profilePhotoSettings: { zoom: 1, crop: { x: 0, y: 0 }, croppedAreaPixels: null as any },
        firstName: '',
        lastName: '',
        designation: '',
        department: '',
        dob: '',
        bloodGroup: '',
        gender: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    // const [showPhotoAdjust, setShowPhotoAdjust] = useState(false);
    const [loading, setLoading] = useState(false);

    // Module Data State
    const [assets, setAssets] = useState<any[]>([]);
    const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [payslips, setPayslips] = useState<any[]>([]);
    const [dataLoading, setDataLoading] = useState(false);

    // Cropper state
    // const [crop, setCrop] = useState({ x: 0, y: 0 });
    // const [zoom, setZoom] = useState(1);
    // const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        const loadTabData = async () => {
            setDataLoading(true);
            try {
                if (activeTab === 'assets' && assets.length === 0) {
                    const data = await api.get<any[]>('/assets/my');
                    if (data) setAssets(data);
                }
                if (activeTab === 'leaves' && leaveBalances.length === 0) {
                    const data = await api.get<any[]>('/leaves/balances');
                    if (data) setLeaveBalances(data);
                }
                if (activeTab === 'attendance' && attendanceHistory.length === 0) {
                    const data = await api.get<any[]>('/attendance/my-history');
                    if (data) setAttendanceHistory(data);
                }
                if (activeTab === 'bank' && payslips.length === 0) {
                    const data = await api.get<any[]>('/salary/my');
                    if (data) setPayslips(data);
                }
            } catch (error) {
                console.error("Failed to load tab data", error);
            } finally {
                setDataLoading(false);
            }
        };
        loadTabData();
    }, [activeTab]);

    const fetchProfile = async () => {
        try {
            const data = await api.get<any>('/profile');
            if (data) {
                setProfile(data);
                if (data.profile) {
                    // Sync with Global Auth Context
                    if (updateUser && user) {
                        updateUser({ ...user, profile: data.profile });
                    }
                    
                    let settings = { zoom: 1, crop: { x: 0, y: 0 }, croppedAreaPixels: null as any };
                    if (data.profile.profilePhotoSettings) {
                        try {
                            settings = typeof data.profile.profilePhotoSettings === 'string'
                                ? JSON.parse(data.profile.profilePhotoSettings)
                                : data.profile.profilePhotoSettings;
                        } catch (e) { console.error("Failed to parse settings", e); }
                    }

                    setForm({
                        phone: data.profile.phone || '',
                        address: data.profile.address || '',
                        emergencyContact: data.profile.emergencyContact || '',
                        profilePhoto: data.profile.profilePhoto || '',
                        profilePhotoSettings: settings,
                        firstName: data.profile.firstName || '',
                        lastName: data.profile.lastName || '',
                        designation: data.profile.designation || '',
                        department: data.profile.department || '',
                        dob: data.profile.dob || '',
                        bloodGroup: data.profile.bloodGroup || '',
                        gender: data.profile.gender || ''
                    });
                }
            }
        } catch (error) { console.error(error); }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            setLoading(true);
            const data = await api.post<{ urls: { originalUrl: string } }>('/upload/image', uploadData);

            if (data && data.urls?.originalUrl) {
                const newPhotoUrl = data.urls.originalUrl;

                // 1. Update local form state
                setForm(prev => ({
                    ...prev,
                    profilePhoto: newPhotoUrl,
                    profilePhotoSettings: { zoom: 1, crop: { x: 0, y: 0 }, croppedAreaPixels: null as any }
                }));

                // 2. Persist to backend immediately
                // Note: We use the current 'form' state but override profilePhoto with the one we just got.
                const updatedProfile = await api.put<any>('/profile', { ...form, profilePhoto: newPhotoUrl });

                // 3. Update Global Auth Context to reflect in Header immediately
                if (updatedProfile && updateUser && user) {
                    updateUser({ ...user, profile: updatedProfile });
                }
                // setShowPhotoAdjust(true);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to upload photo. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const updatedProfile = await api.put<any>('/profile', form);
            if (updatedProfile) {
                if (updateUser && user) updateUser({ ...user, profile: updatedProfile });
                alert('Profile Updated');
                setIsEditing(false);
                fetchProfile();
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    if (!profile) return <div className="p-10 flex justify-center"><div className="loader"></div></div>;

    const getInitials = () => {
        const first = profile.profile?.firstName?.charAt(0) || '';
        const last = profile.profile?.lastName?.charAt(0) || '';
        return (first + last).toUpperCase() || profile.email?.charAt(0).toUpperCase();
    };

    const tabs = [
        { id: 'general', label: 'General Info', icon: 'profile' },
        { id: 'job', label: 'Job Details', icon: 'roles' },
        { id: 'docs', label: 'Documents', icon: 'file_text' },
        { id: 'bank', label: 'Bank & Payroll', icon: 'payroll' },
        { id: 'leaves', label: 'Leave Summary', icon: 'leaves' },
        { id: 'attendance', label: 'Attendance', icon: 'attendance' },
        { id: 'assets', label: 'Assets', icon: 'assets' },
        { id: 'preferences', label: 'Preferences', icon: 'settings' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="section-title-premium">General Information</h3>
                            <button onClick={() => setIsEditing(!isEditing)} className="text-sm font-bold text-slate-500 hover:text-purple-600 transition-colors">
                                {isEditing ? 'Cancel Editing' : 'Edit Details'}
                            </button>
                        </div>
                        {isEditing ? (
                            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="label" htmlFor="dob">Date of Birth</label>
                                    <input id="dob" type="date" className="input-field" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} aria-label="Date of Birth" />
                                </div>
                                <div className="space-y-1">
                                    <label className="label" htmlFor="bloodWait">Blood Group</label>
                                    <select id="bloodGroup" className="input-field" value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })} aria-label="Blood Group">
                                        <option value="">Select...</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="label" htmlFor="gender">Gender</label>
                                    <select id="gender" className="input-field" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} aria-label="Gender">
                                        <option value="">Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="label" htmlFor="phone">Phone</label>
                                    <input id="phone" type="text" className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} aria-label="Phone Number" placeholder="+91..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="label" htmlFor="emergency">Emergency Contact</label>
                                    <input id="emergency" type="text" className="input-field" value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} aria-label="Emergency Contact" placeholder="Name - Phone" />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="label" htmlFor="address">Address</label>
                                    <textarea id="address" className="input-field" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={3} aria-label="Residential Address" placeholder="Enter your full address" />
                                </div>
                                <div className="md:col-span-2">
                                    <Button type="submit" disabled={loading} className="w-full justify-center">Save Changes</Button>
                                </div>
                            </form>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                <InfoItem label="Employee ID" value={profile.employeeId || 'N/A'} />
                                <InfoItem label="Email" value={profile.email} />
                                <InfoItem label="Phone" value={profile.profile?.phone || 'N/A'} />
                                <InfoItem label="DOB" value={form.dob ? new Date(form.dob).toLocaleDateString() : 'N/A'} />
                                <InfoItem label="Blood Group" value={form.bloodGroup || 'N/A'} />
                                <InfoItem label="Gender" value={form.gender || 'N/A'} />
                                <InfoItem label="Emergency Contact" value={profile.profile?.emergencyContact || 'N/A'} />
                                <InfoItem label="Address" value={profile.profile?.address || 'N/A'} fullWidth />
                            </div>
                        )}
                    </div>
                );
            case 'job':
                return (
                    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                        <h3 className="section-title-premium mb-6">Job Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                            <InfoItem label="Designation" value={profile.profile?.designation} />
                            <InfoItem label="Department" value={profile.profile?.department} />
                            <InfoItem label="Reporting Manager" value={profile.manager?.profile?.firstName ? `${profile.manager.profile.firstName} ${profile.manager.profile.lastName}` : 'N/A'} />
                            <InfoItem label="Date of Joining" value={new Date(profile.profile?.joiningDate || Date.now()).toLocaleDateString()} />
                            <InfoItem label="Work Location" value="Bangalore, India (TBC)" />
                            <InfoItem label="Employment Status" value="Permanent" />
                        </div>
                    </div>
                );
            case 'assets':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="section-title-premium">My Assets</h3>
                        </div>
                        {dataLoading ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height={100} className="mb-4" />) : assets.length === 0 ? (
                            <EmptyState title="No Assets" description="No assets assigned to you yet." icon="assets" />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {assets.map(asset => (
                                    <div key={asset.id} className="p-4 border border-slate-200 rounded-xl bg-white flex items-center gap-4 shadow-sm">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg text-2xl">
                                            {asset.type === 'LAPTOP' ? '💻' : asset.type === 'PHONE' ? '📱' : '📦'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">{asset.name}</h4>
                                            <p className="text-xs text-slate-500 font-mono">{asset.serialNumber}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'leaves':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <h3 className="section-title-premium">Leave Balances</h3>
                        {dataLoading ? <Skeleton height={100} /> : leaveBalances.length === 0 ? (
                            <EmptyState title="No Leave Data" description="No leave balances found." icon="leaves" />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {leaveBalances.map((bal: any) => (
                                    <div key={bal.leaveType.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                                        <h4 className="text-sm font-bold text-slate-500 uppercase">{bal.leaveType.name}</h4>
                                        <div className="text-3xl font-black text-slate-800 my-2">{bal.balance}</div>
                                        <p className="text-xs text-slate-400">Days Available</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'attendance':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <h3 className="section-title-premium">Recent Attendance</h3>
                        {dataLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={40} className="mb-2" />) : attendanceHistory.length === 0 ? (
                            <EmptyState title="No Records" description="No attendance history found." icon="attendance" />
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="p-3 font-semibold text-slate-600">Date</th>
                                            <th className="p-3 font-semibold text-slate-600">Check In</th>
                                            <th className="p-3 font-semibold text-slate-600">Check Out</th>
                                            <th className="p-3 font-semibold text-slate-600">Total Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceHistory.slice(0, 7).map((record: any) => (
                                            <tr key={record.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                <td className="p-3 font-medium text-slate-800">{new Date(record.date).toLocaleDateString()}</td>
                                                <td className="p-3 text-emerald-600 font-mono">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                <td className="p-3 text-red-600 font-mono">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                <td className="p-3 font-bold text-slate-700">{record.hours ? String(Number(record.hours).toFixed(1)) + ' hrs' : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            case 'bank':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <h3 className="section-title-premium">Bank & Payroll</h3>

                        {/* Bank Details */}
                        <div className="card-premium p-6">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <Icon name="payroll" size={24} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-slate-800">Bank Account Details</h4>
                                    <p className="text-xs text-slate-500">For salary crediting</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                <DetailItem label="Bank Name" value={profile.onboarding?.bankName} icon="business" />
                                <DetailItem label="Branch" value={profile.onboarding?.branchName} />
                                <DetailItem label="Account Number" value={profile.onboarding?.accountNumber ? `••••${profile.onboarding.accountNumber.slice(-4)}` : 'N/A'} isCopyable copyValue={profile.onboarding?.accountNumber} />
                                <DetailItem label="IFSC Code" value={profile.onboarding?.ifscCode} isCopyable />
                                <DetailItem label="Account Holder" value={profile.onboarding?.accountHolderName} />
                                <DetailItem label="Payment Mode" value={profile.onboarding?.salaryPaymentMode} />
                            </div>
                        </div>

                        {/* Salary Structure */}
                        <div className="card-premium p-6">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Icon name="payroll" size={24} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-slate-800">Salary Structure</h4>
                                    <p className="text-xs text-slate-500">Breakdown of your compensation</p>
                                </div>
                            </div>

                            {!profile.salary ? (
                                <div className="text-center py-8 text-slate-400">
                                    Salary structure not configured. Contact HR.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 text-sm">
                                        <div className="flex justify-between p-2 rounded hover:bg-slate-50">
                                            <span className="text-slate-500">Basic Salary</span>
                                            <span className="font-mono font-medium text-slate-700">₹{profile.salary.basic?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between p-2 rounded hover:bg-slate-50">
                                            <span className="text-slate-500">Net Salary</span>
                                            <span className="font-mono font-medium text-emerald-600">₹{profile.salary.net?.toLocaleString() || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between p-2 rounded hover:bg-slate-50">
                                            <span className="text-slate-500">HRA</span>
                                            <span className="font-mono font-medium text-slate-700">₹{profile.salary.hra?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between p-2 rounded hover:bg-slate-50">
                                            <span className="text-slate-500">Allowances</span>
                                            <span className="font-mono font-medium text-slate-700">₹{profile.salary.allowances?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between p-2 rounded hover:bg-slate-50">
                                            <span className="text-slate-500">Deductions</span>
                                            <span className="font-mono font-medium text-rose-600">-₹{profile.salary.deductions?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                                        <span className="font-bold text-slate-800">Annual CTC</span>
                                        <span className="font-bold text-xl text-indigo-600 font-mono">₹{profile.salary.ctc?.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <h3 className="section-title-premium pt-4">Payslips</h3>
                        {dataLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={60} className="mb-2" />) : payslips.length === 0 ? (
                            <EmptyState title="No Payslips" description="No payslips generated for you yet." icon="payroll" />
                        ) : (
                            <div className="space-y-3">
                                {payslips.map(slip => (
                                    <div key={slip.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center hover:shadow-md transition-shadow cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                                <Icon name="file_text" size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{new Date(slip.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h4>
                                                <p className="text-xs text-slate-500">Processed on {new Date(slip.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="secondary" onClick={() => window.open(slip.url, '_blank')}>Download PDF</Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'docs': {
                const docs = profile?.profile?.documents ? JSON.parse(profile.profile.documents) : [];
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="section-title-premium">My Documents</h3>
                        </div>
                        {docs.length === 0 ? (
                            <EmptyState title="No Documents" description="No documents linked to your profile." icon="file_text" />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {docs.map((doc: any, index: number) => (
                                    <div key={index} className="p-4 border border-slate-200 rounded-xl bg-white flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                                <Icon name="file_text" size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 capitalize">{doc.type?.replace(/_/g, ' ') || 'Document'}</h4>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${doc.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {doc.status || 'PENDING'}
                                                </span>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="secondary" onClick={() => window.open(resolveImageUrl(doc.url), '_blank')}>View</Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            }

            default:
                return (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-12 text-center animate-fade-in">
                        <div className="text-4xl mb-4 text-slate-300">🚧</div>
                        <h3 className="text-lg font-bold text-slate-500">Coming Soon</h3>
                        <p className="text-slate-400">The "{tabs.find(t => t.id === activeTab)?.label}" section is under development.</p>
                    </div>
                );
        }
    };

    return (
        <div className="page-container flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
                {/* Profile Card Mini */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                    <div className="relative w-24 h-24 mx-auto mb-4">
                        <div className="w-full h-full rounded-full overflow-hidden border-4 border-slate-50 shadow-inner">
                             {form.profilePhoto ? (
                                <img src={resolveImageUrl(form.profilePhoto)} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-300">
                                    {getInitials()}
                                </div>
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 p-1.5 bg-purple-600 text-white rounded-full cursor-pointer hover:bg-purple-700 transition" aria-label="Upload Profile Photo">
                            <Icon name="upload" size={14} />
                            <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" aria-label="Upload Profile Photo" />
                        </label>
                    </div>
                    <div className="mb-4">
                        <h2 className="font-bold text-slate-800 text-lg">{form.firstName} {form.lastName}</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase mb-1">{form.designation}</p>
                        <p className="text-[10px] text-slate-400">Allowed: JPG, PNG, SVG</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        {clockedIn ? (
                            <div className="text-center mb-3">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Worked Today</div>
                                <div className="text-2xl font-black text-emerald-600 font-mono">{workDuration}</div>
                            </div>
                        ) : null}
                        <Button
                            className={`w-full justify-center ${clockedIn ? '!bg-rose-50 !text-rose-600 hover:!bg-rose-100 border border-rose-200' : 'btn-primary'}`}
                            onClick={clockedIn ? handleClockOut : handleClockIn}
                            disabled={clockingLoading}
                        >
                            {clockingLoading ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                            ) : (
                                <Icon name={clockedIn ? "logout" : "attendance"} size={18} className="mr-2" />
                            )}
                            {clockingLoading ? "Wait..." : (clockedIn ? "Clock Out" : "Clock In")}
                        </Button>
                    </div>
                </div>

                <nav className="flex flex-col gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                                ? 'bg-purple-50 text-purple-700 shadow-sm translate-x-1'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                        >
                            <Icon name={tab.icon as any} size={18} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
                {renderContent()}
            </div>

            {/* Reuse Photo Adjust Modal logic here if needed, omitted for brevity as it's separate overlay */}
        </div>
    );
};

const InfoItem = ({ label, value, fullWidth = false }: { label: string, value: string | undefined, fullWidth?: boolean }) => (
    <div className={fullWidth ? 'col-span-full' : ''}>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</div>
        <div className="font-semibold text-slate-700 text-sm">{value || 'Not set'}</div>
    </div>
);

const DetailItem = ({ label, value, isCopyable, copyValue }: { label: string, value: string | undefined, icon?: string, isCopyable?: boolean, copyValue?: string }) => {
    const handleCopy = () => {
        if (copyValue || value) {
            navigator.clipboard.writeText(copyValue || value || '');
            alert('Copied to clipboard');
        }
    };
    return (
        <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</div>
            <div className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                {/* {icon && <Icon name={icon as any} size={14} className="text-slate-400" />} */}
                {value || 'Not set'}
                {isCopyable && (
                    <button onClick={handleCopy} className="text-slate-400 hover:text-purple-600 ml-1" title="Copy">
                        <Icon name="copy" size={12} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default MyProfile;
