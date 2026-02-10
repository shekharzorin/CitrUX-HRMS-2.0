import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icons';
import Cropper from 'react-easy-crop';

// --- Types & Constants ---

interface ProfilePhotoSettings {
    zoom: number;
    crop: { x: number; y: number };
    croppedAreaPixels: any;
}

interface OnboardingFormData {
    fullName: string;
    fatherName: string;
    motherName: string;
    guardianName: string;
    dateOfBirth: string;
    gender: string;
    maritalStatus: string;
    bloodGroup: string;
    nationality: string;
    profilePhoto: string;
    profilePhotoSettings: ProfilePhotoSettings | any; // relaxed for now to mix
    personalMobile: string;
    officialMobile: string;
    personalEmail: string;
    officialEmail: string;
    currentAddress: string;
    permanentAddress: string;
    sameAsCurrentAddress: boolean;
    emergencyContacts: any[];
    department: string;
    designation: string;
    employmentType: string;
    dateOfJoining: string;
    workLocation: string;
    shift: string;
    workingHours: string;
    probationPeriodMonths: number;
    noticePeriodDays: number;
    experiences: any[];
    education: any[];
    documents: any[];
    medicalConditions: string;
    allergies: string;
    aadhaarNumber: string;
    panNumber: string;
    uanNumber: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    companyPolicyAccepted: boolean;
    ndaAccepted: boolean;
    codeOfConductAccepted: boolean;
    status?: string;
    [key: string]: any; // Allow indexing
}

const STEPS = [
    { id: 1, title: 'Personal Profile', subtitle: 'Basic & Info', icon: 'profile', color: 'glassy-purple' },
    { id: 2, title: 'Professional Info', subtitle: 'Work & Education', icon: 'employees', color: 'glassy-green' },
    { id: 3, title: 'Identity & Financial', subtitle: 'IDs & Bank', icon: 'onboarding', color: 'glassy-blue' },
    { id: 4, title: 'Documents', subtitle: 'Upload files', icon: 'reports', color: 'glassy-orange' },
    { id: 5, title: 'Additional', subtitle: 'Declarations', icon: 'certificates', color: 'glassy-purple' }
];

// --- Reusable Components ---

const SectionHeader = ({ title, description, icon, color }: { title: string, description?: string, icon?: any, color?: string }) => (
    <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
            {icon && (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center glassy-icon-base ${color || 'glassy-purple'}`}>
                    <Icon name={icon} size={20} />
                </div>
            )}
            <h2 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">{title}</h2>
        </div>
        {description && <p className="text-[var(--text-muted)] mt-1 text-sm">{description}</p>}
    </div>
);

// --- Helper Functions ---

const getStepErrors = (step: number, data: OnboardingFormData) => {
    const newErrors: any = {};
    if (step === 1) {
        if (!data.fullName) newErrors.fullName = 'Required';
        if (!data.personalMobile) newErrors.personalMobile = 'Required';
        if (!data.personalEmail) newErrors.personalEmail = 'Required';
        if (!data.currentAddress) newErrors.currentAddress = 'Required';
    }
    if (step === 2) {
        if (!data.department) newErrors.department = 'Required';
        if (!data.designation) newErrors.designation = 'Required';
        if (!data.dateOfJoining) newErrors.dateOfJoining = 'Required';
    }
    if (step === 3) {
        if (!data.aadhaarNumber) newErrors.aadhaarNumber = 'Required';
        if (!data.panNumber) newErrors.panNumber = 'Required';
        if (!data.bankName) newErrors.bankName = 'Required';
        if (!data.accountNumber) newErrors.accountNumber = 'Required';
    }
    return newErrors;
};

// --- Main Component ---

const OnboardingForm: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState('DRAFT');
    const [formData, setFormData] = useState<OnboardingFormData>({
        fullName: '', fatherName: '', motherName: '', guardianName: '',
        dateOfBirth: '', gender: '', maritalStatus: '', bloodGroup: '', nationality: '',
        profilePhoto: '', profilePhotoSettings: { zoom: 1, crop: { x: 0, y: 0 }, croppedAreaPixels: null },
        personalMobile: '', officialMobile: '', personalEmail: '', officialEmail: '',
        currentAddress: '', permanentAddress: '', sameAsCurrentAddress: false,
        emergencyContacts: [], department: '', designation: '', employmentType: '', dateOfJoining: '',
        workLocation: '', shift: '', workingHours: '', probationPeriodMonths: 0, noticePeriodDays: 0,
        experiences: [], education: [], documents: [],
        medicalConditions: '', allergies: '',
        aadhaarNumber: '', panNumber: '', uanNumber: '',
        bankName: '', accountNumber: '', ifscCode: '',
        companyPolicyAccepted: false, ndaAccepted: false, codeOfConductAccepted: false
    });
    const [errors, setErrors] = useState<any>({});
    const [showPhotoAdjust, setShowPhotoAdjust] = useState(false);
    const [showSavedMessage, setShowSavedMessage] = useState(false);

    // Cropper state
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    // --- Effects & API ---

    const fetchStatus = useCallback(async () => {
        try {
            const data = await api.get<any>('/onboarding/status');
            if (data) {
                setStatus(data.status);

                if (data.profilePhotoSettings && typeof data.profilePhotoSettings === 'string') {
                    try {
                        data.profilePhotoSettings = JSON.parse(data.profilePhotoSettings);
                    } catch (_) {
                        data.profilePhotoSettings = { zoom: 1, crop: { x: 0, y: 0 }, croppedAreaPixels: null };
                    }
                }

                setFormData((prev: any) => ({ ...prev, ...data }));

                if (data.status !== 'APPROVED' && data.status !== 'SUBMITTED') {
                    let restoredStep = 1;
                    for (let i = 1; i <= STEPS.length; i++) {
                        const stepErrors = getStepErrors(i, data);
                        if (Object.keys(stepErrors).length > 0) {
                            restoredStep = i;
                            break;
                        }
                    }
                    setCurrentStep(restoredStep);
                }
            }
        } catch (error) { console.error('Error fetching status:', error); }
    }, []);

    useEffect(() => {
        const init = async () => { await fetchStatus(); };
        init();
    }, [fetchStatus]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev: any) => ({ ...prev, [name]: undefined }));
    };

    const handleBlur = () => {
        saveProgress(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, _unused?: string, docType?: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const res = await api.post<{ url: string }>('/onboarding/upload', uploadData);
            if (res && res.url) {
                const { url } = res;
                if (!docType) {
                    setFormData((prev: any) => ({
                        ...prev,
                        profilePhoto: url,
                        profilePhotoSettings: { zoom: 1, crop: { x: 0, y: 0 }, croppedAreaPixels: null }
                    }));
                    setShowPhotoAdjust(true);
                } else {
                    const newDocs = formData.documents ? formData.documents.filter((d: any) => d.type !== docType) : [];
                    newDocs.push({ type: docType, url, status: 'PENDING', uploadedAt: new Date().toISOString() });
                    setFormData((p: any) => ({ ...p, documents: newDocs }));
                }
            }
        } catch (e) { console.error(e); }
    };

    const saveProgress = async (quiet = false) => {
        if (quiet) setIsSaving(true);

        try {
            await api.put('/onboarding/update', formData);
            setShowSavedMessage(true);
            setTimeout(() => setShowSavedMessage(false), 3000);
        } catch (error) { console.error('Save draft failed', error); }

        if (quiet) setIsSaving(false);
    };

    const isStepComplete = (stepId: number) => {
        return Object.keys(getStepErrors(stepId, formData)).length === 0;
    };

    const handleNext = async () => {
        const stepErrors = getStepErrors(currentStep, formData);
        if (Object.keys(stepErrors).length > 0) {
            setErrors(stepErrors);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        await saveProgress(true);
        if (currentStep < STEPS.length) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSubmit = async () => {
        if (!window.confirm('Are you sure you want to submit?')) return;
        try {
            await api.post('/onboarding/submit', formData);
            navigate('/');
        } catch (error) { console.error(error); }
    };

    if (status === 'APPROVED') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="text-center max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">
                        <Icon name="check_circle" size={48} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Onboarding Complete!</h1>
                    <p className="text-slate-500 mb-8 leading-relaxed">Your profile has been approved. You can now access all features of the HRMS portal.</p>
                    <Button onClick={() => navigate('/')} className="w-full h-14 text-lg rounded-2xl shadow-lg">Go to Dashboard</Button>
                </div>
            </div>
        );
    }

    const dynamicStyles = `
        .profile-photo-dynamic {
            ${formData.profilePhotoSettings?.croppedAreaPixels ? `
                transform: scale(${100 / formData.profilePhotoSettings.croppedAreaPixels.width}) translate(${-formData.profilePhotoSettings.croppedAreaPixels.x}px, ${-formData.profilePhotoSettings.croppedAreaPixels.y}px);
                position: absolute;
                width: auto;
                height: auto;
                min-width: 100%;
                min-height: 100%;
                top: 0;
                left: 0;
                transform-origin: top left;
            ` : `
                transform: scale(${formData.profilePhotoSettings?.zoom || 1}) translate(${formData.profilePhotoSettings?.x || 0}%, ${formData.profilePhotoSettings?.y || 0}%);
                width: 100%;
                height: 100%;
                object-fit: cover;
                position: relative;
            `}
        }
        .onboarding-progress-dynamic {
            width: ${(currentStep / STEPS.length) * 100}%;
        }
    `;

    return (
        <div className="onboarding-container pb-20">
            <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="onboarding-title">Employee Onboarding</h1>
                    <p className="onboarding-subtitle">Please complete all steps to set up your official profile.</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] shadow-sm">
                    {isSaving ? (
                        <span className="text-xs font-bold text-[var(--primary)] animate-pulse">Auto-saving...</span>
                    ) : showSavedMessage ? (
                        <span className="text-xs font-bold text-[var(--success)]">Draft saved ✓</span>
                    ) : (
                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">{status}</span>
                    )}
                    <div className={`w-2.5 h-2.5 rounded-full ${status === 'DRAFT' ? 'bg-amber-400' : 'bg-[var(--success)]'}`} />
                </div>
            </div>

            <div className="onboarding-grid">
                <aside className="onboarding-stepper-glass hidden lg:block">
                    <div className="space-y-2">
                        {STEPS.map((step) => {
                            const isGreen = isStepComplete(step.id);
                            const isActive = currentStep === step.id;
                            const isPast = step.id < currentStep;

                            return (
                                <div
                                    key={step.id}
                                    onClick={() => isPast && setCurrentStep(step.id)}
                                    className={`onboarding-step-item ${isActive ? 'onboarding-step-active' : ''} ${!isPast && !isActive ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
                                >
                                    <div className={`onboarding-step-icon glassy-icon-base ${isActive ? step.color : isGreen ? 'glassy-green' : 'glassy-blue'}`}>
                                        {isGreen && !isActive ? <Icon name="check_circle" size={16} /> : <Icon name={step.icon as any} size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-bold truncate ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-main)]'}`}>
                                            {step.title}
                                        </div>
                                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                                            {step.subtitle}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 pt-8 border-t border-[var(--border-color)]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Overall Progress</span>
                            <span className="text-xs font-bold text-[var(--primary)]">{Math.round((currentStep / STEPS.length) * 100)}%</span>
                        </div>
                        <div className="w-full h-2 bg-[var(--bg-body)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--primary)] transition-all duration-500 onboarding-progress-dynamic" />
                        </div>
                    </div>
                </aside>

                <div className="lg:hidden mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-[var(--text-main)]">Step {currentStep} of {STEPS.length}</span>
                        <span className="text-sm font-bold text-[var(--primary)]">{STEPS[currentStep - 1].title}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden border border-[var(--border-color)]">
                        <div className="h-full bg-[var(--primary)] transition-all duration-500 onboarding-progress-dynamic" />
                    </div>
                </div>

                <main className="onboarding-card-premium bg-[var(--bg-surface)] rounded-[32px] border border-[var(--border-color)] shadow-xl overflow-hidden relative min-h-[600px] flex flex-col">
                    <div className="flex-1 p-0">
                        {currentStep === 1 && (
                            <div className="space-y-10">
                                <SectionHeader title="Personal Profile" description="Basic details for your official record." icon="profile" color="glassy-purple" />
                                <div className="flex flex-col sm:flex-row gap-10 items-center sm:items-start mb-10">
                                    <div className="shrink-0">
                                        <div className="photo-upload-zone">
                                            {formData.profilePhoto ? (
                                                <img src={formData.profilePhoto.includes('http') ? formData.profilePhoto + (formData.profilePhoto.includes('?') ? '&' : '?') + `token=${token}` : formData.profilePhoto} alt="Profile" className="profile-photo-dynamic" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)] bg-[var(--bg-body)] opacity-50">
                                                    <Icon name="profile" size={64} strokeWidth={1} />
                                                    <span className="text-[10px] font-bold mt-2 uppercase tracking-widest">ID PHOTO</span>
                                                </div>
                                            )}
                                            <label className="photo-overlay-btn cursor-pointer">
                                                <Icon name="upload" size={20} />
                                                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'profilePhoto')} title="Upload Profile Photo" aria-label="Upload Profile Photo" />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 w-full">
                                        <div className="md:col-span-2">
                                            <Input label="Full Name" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} onBlur={handleBlur} error={errors.fullName} required />
                                        </div>
                                        <Input label="Father's Name" id="fatherName" name="fatherName" value={formData.fatherName} onChange={handleChange} onBlur={handleBlur} />
                                        <Input label="Date of Birth" id="dateOfBirth" type="date" name="dateOfBirth" value={formData.dateOfBirth?.split('T')[0]} onChange={handleChange} />
                                        <Select label="Gender" id="gender" name="gender" value={formData.gender} onChange={handleChange} options={['Male', 'Female', 'Other']} />
                                        <Select label="Marital Status" id="maritalStatus" name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} options={['Single', 'Married', 'Divorced']} />
                                    </div>
                                </div>
                                <div className="pt-10 border-t border-[var(--border-color)]">
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-6">Contact & Address</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <Input label="Mobile" id="personalMobile" name="personalMobile" value={formData.personalMobile} onChange={handleChange} onBlur={handleBlur} error={errors.personalMobile} required />
                                        <Input label="Email" id="personalEmail" name="personalEmail" value={formData.personalEmail} onChange={handleChange} onBlur={handleBlur} error={errors.personalEmail} required />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="currentAddress" className="block text-sm font-medium text-[var(--text-main)]">Current Address</label>
                                        <textarea id="currentAddress" name="currentAddress" rows={3} className="input-field w-full" value={formData.currentAddress} onChange={handleChange} onBlur={handleBlur} placeholder="Permanent Address" title="Current Address" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-10">
                                <SectionHeader title="Professional Info" description="Your role and designation details." icon="employees" color="glassy-green" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input label="Department" id="department" name="department" value={formData.department} onChange={handleChange} onBlur={handleBlur} error={errors.department} required />
                                    <Input label="Designation" id="designation" name="designation" value={formData.designation} onChange={handleChange} onBlur={handleBlur} error={errors.designation} required />
                                    <Input label="Joining Date" id="dateOfJoining" type="date" name="dateOfJoining" value={formData.dateOfJoining?.split('T')[0]} onChange={handleChange} onBlur={handleBlur} required />
                                    <Select label="Location" id="workLocation" name="workLocation" value={formData.workLocation} onChange={handleChange} options={['Head Office', 'Remote', 'Regional']} />
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="space-y-10">
                                <SectionHeader title="Identity & Bank" description="Verification IDs and payout details." icon="onboarding" color="glassy-blue" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input label="Aadhaar Number" id="aadhaarNumber" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} onBlur={handleBlur} error={errors.aadhaarNumber} required />
                                    <Input label="PAN Number" id="panNumber" name="panNumber" value={formData.panNumber} onChange={handleChange} onBlur={handleBlur} error={errors.panNumber} required />
                                    <Input label="Bank Name" id="bankName" name="bankName" value={formData.bankName} onChange={handleChange} />
                                    <Input label="Account Number" id="accountNumber" name="accountNumber" value={formData.accountNumber} onChange={handleChange} />
                                </div>
                            </div>
                        )}

                        {currentStep === 4 && (
                            <div className="space-y-8">
                                <SectionHeader title="Document Uploads" description="Upload digital copies of your IDs." icon="reports" color="glassy-orange" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {['aadhaar_card', 'pan_card', 'resume'].map(doc => (
                                        <div key={doc} className="p-6 rounded-2xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-body)] flex flex-col items-center justify-center text-center">
                                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm text-[var(--primary)]">
                                                <Icon name="upload" size={20} />
                                            </div>
                                            <h5 className="font-bold text-sm uppercase tracking-wide">{doc.replace('_', ' ')}</h5>
                                            <label className="mt-4 px-4 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl cursor-pointer hover:scale-105 transition-transform">
                                                Select File
                                                <input type="file" className="hidden" onChange={e => handleFileUpload(e, undefined, doc)} title={`Upload ${doc.replace('_', ' ')} `} aria-label={`Upload ${doc.replace('_', ' ')} `} />
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentStep === 5 && (
                            <div className="space-y-10">
                                <SectionHeader title="Final Declarations" description="Review and accept our policies." icon="certificates" color="glassy-purple" />
                                <div className="space-y-4">
                                    {['companyPolicyAccepted', 'ndaAccepted', 'codeOfConductAccepted'].map(key => (
                                        <label key={key} className={`flex items-start gap-4 p-5 rounded-2xl border transition-all cursor-pointer ${formData[key] ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-[var(--border-color)] bg-[var(--bg-body)]'}`}>
                                            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${formData[key] ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'border-[var(--border-color)] bg-white'}`}>
                                                {formData[key] && <Icon name="check_circle" size={10} />}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.checked })} />
                                            <div>
                                                <span className="font-bold text-sm text-[var(--text-main)] capitalize">{key.replace('Accepted', '').replace(/[A-Z]/g, ' $&')} Agreement</span>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">I have read and agree to the terms and conditions.</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-10 border-t border-[var(--border-color)] flex items-center justify-between">
                        <Button variant="secondary" onClick={handleBack} disabled={currentStep === 1} className={currentStep === 1 ? 'opacity-0 pointer-events-none' : ''}>
                            <Icon name="chevron_left" size={14} /> Back
                        </Button>
                        <div className="flex gap-4">
                            <Button variant="secondary" onClick={() => saveProgress(false)} className="hidden sm:flex">
                                <Icon name="save" size={16} /> Save Draft
                            </Button>
                            {currentStep === STEPS.length ? (
                                <Button onClick={handleSubmit} className="px-10">
                                    Submit Profile
                                </Button>
                            ) : (
                                <Button onClick={handleNext} className="px-12">
                                    Continue <Icon name="chevron_right" size={14} />
                                </Button>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {showPhotoAdjust && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[var(--bg-surface)] rounded-[32px] w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="px-8 py-6 border-b border-[var(--border-color)] flex justify-between items-center">
                            <h3 className="text-xl font-bold">Adjust Photo</h3>
                            <button onClick={() => setShowPhotoAdjust(false)} className="text-[var(--text-muted)] p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Close" aria-label="Close">
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        <div className="h-[300px] relative bg-slate-900">
                            <Cropper image={formData.profilePhoto + (formData.profilePhoto.includes('?') ? '&' : '?') + `token=${token}`} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, p) => setCroppedAreaPixels(p)} cropShape="round" />
                        </div>
                        <div className="p-8">
                            <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-full h-2 mb-8 accent-[var(--primary)] cursor-pointer" title="Zoom Scale" aria-label="Zoom Scale" />
                            <Button onClick={() => {
                                setFormData({ ...formData, profilePhotoSettings: { crop, zoom, croppedAreaPixels } });
                                setShowPhotoAdjust(false);
                            }} className="w-full">Save Adjustment</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnboardingForm;
