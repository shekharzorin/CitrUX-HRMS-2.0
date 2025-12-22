import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    FaUser, FaUniversity, FaCheckCircle, FaChevronRight,
    FaChevronLeft, FaCloudUploadAlt, FaPlus, FaTrash,
    FaFileAlt, FaBriefcase, FaGraduationCap, FaHeartbeat,
    FaShieldAlt, FaHome, FaSave
} from 'react-icons/fa';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

// --- Types & Constants ---

const STEPS = [
    { id: 1, title: 'Personal Details', subtitle: 'Basic information', icon: FaUser },
    { id: 2, title: 'Contact Info', subtitle: 'Address & communication', icon: FaHome },
    { id: 3, title: 'Employment', subtitle: 'Job role & joining', icon: FaBriefcase },
    { id: 4, title: 'Experience', subtitle: 'Work history', icon: FaBriefcase },
    { id: 5, title: 'Education', subtitle: 'Qualifications', icon: FaGraduationCap },
    { id: 6, title: 'Identity Documents', subtitle: 'Govt. IDs & Pan', icon: FaShieldAlt },
    { id: 7, title: 'Bank Details', subtitle: 'Salary account info', icon: FaUniversity },
    { id: 8, title: 'Health & Medical', subtitle: 'Health declaration', icon: FaHeartbeat },
    { id: 9, title: 'Documents', subtitle: 'Upload files', icon: FaFileAlt },
    { id: 10, title: 'Declarations', subtitle: 'Policy acceptance', icon: FaCheckCircle }
];

// --- Reusable Components ---



const SectionHeader = ({ title, description }: { title: string, description?: string }) => (
    <div className="mb-8 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
        {description && <p className="text-slate-500 mt-1 text-sm">{description}</p>}
    </div>
);

// --- Main Component ---

const OnboardingForm: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('DRAFT');
    const [formData, setFormData] = useState<any>({
        fullName: '', fatherName: '', motherName: '', guardianName: '',
        dateOfBirth: '', gender: '', maritalStatus: '', bloodGroup: '', nationality: '', profilePhoto: '',
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

    // --- Effects & API ---

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/onboarding/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStatus(data.status);
                setFormData((prev: any) => ({ ...prev, ...data }));
            }
        } catch (error) { console.error('Error fetching status:', error); }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev: any) => ({ ...prev, [name]: undefined }));
    };

    const handleArrayChange = (field: string, index: number, key: string, value: any) => {
        const updatedArray = [...(formData[field] || [])];
        if (!updatedArray[index]) updatedArray[index] = {};
        updatedArray[index][key] = value;
        setFormData((prev: any) => ({ ...prev, [field]: updatedArray }));
    };

    const addArrayItem = (field: string) => {
        setFormData((prev: any) => ({ ...prev, [field]: [...(prev[field] || []), {}] }));
    };

    const removeArrayItem = (field: string, index: number) => {
        const updatedArray = [...(formData[field] || [])];
        updatedArray.splice(index, 1);
        setFormData((prev: any) => ({ ...prev, [field]: updatedArray }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field?: string, docType?: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Simulating upload for demo - in real app, maintain the API call
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const res = await fetch('http://localhost:5000/api/onboarding/upload', {
                method: 'POST', body: uploadData, headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const { url } = await res.json();
                if (field) {
                    setFormData((p: any) => ({ ...p, [field]: url }));
                } else if (docType) {
                    const newDocs = formData.documents ? formData.documents.filter((d: any) => d.type !== docType) : [];
                    newDocs.push({ type: docType, url, status: 'PENDING', uploadedAt: new Date().toISOString() });
                    setFormData((p: any) => ({ ...p, documents: newDocs }));
                }
            }
        } catch (e) { console.error(e); }
    };

    // --- Validation ---

    const getStepErrors = (step: number, data: any) => {
        const newErrors: any = {};
        if (step === 1) {
            if (!data.fullName) newErrors.fullName = 'Full Name is required';
            if (!data.fatherName) newErrors.fatherName = "Father's Name is required";
            if (!data.dateOfBirth) newErrors.dateOfBirth = 'Date of Birth is required';
            if (!data.gender) newErrors.gender = 'Gender is required';
            if (!data.maritalStatus) newErrors.maritalStatus = 'Marital Status is required';
            if (!data.nationality) newErrors.nationality = 'Nationality is required';
        }
        if (step === 2) {
            if (!data.personalMobile) newErrors.personalMobile = 'Mobile number is required';
            else if (!/^\d{10}$/.test(data.personalMobile)) newErrors.personalMobile = 'Must be 10 digits';
            if (!data.personalEmail) newErrors.personalEmail = 'Email is required';
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.personalEmail)) newErrors.personalEmail = 'Invalid email format';
            if (!data.currentAddress) newErrors.currentAddress = 'Current Address is required';
            if (!data.sameAsCurrentAddress && !data.permanentAddress) newErrors.permanentAddress = 'Permanent Address is required';
        }
        if (step === 3) {
            if (!data.department) newErrors.department = 'Department is required';
            if (!data.designation) newErrors.designation = 'Designation is required';
            if (!data.dateOfJoining) newErrors.dateOfJoining = 'Joining Date is required';
            if (!data.workLocation) newErrors.workLocation = 'Work Location is required';
        }
        if (step === 4) {
            // Experience is optional but if filled, should have basic info
            if (data.experiences && data.experiences.length > 0) {
                data.experiences.forEach((exp: any) => {
                    if (!exp.companyName || !exp.designation || !exp.startDate) {
                        newErrors.experiences = 'Please complete all fields for added experiences';
                    }
                });
            }
        }
        if (step === 5) {
            // Education is required
            if (!data.education || data.education.length === 0) {
                newErrors.education = 'At least one education entry is required';
            } else {
                data.education.forEach((edu: any) => {
                    if (!edu.institutionName || !edu.degreeOrCourse || !edu.yearOfPassing) {
                        newErrors.education = 'Please complete all fields for education entries';
                    }
                });
            }
        }
        if (step === 6) {
            if (!data.aadhaarNumber) newErrors.aadhaarNumber = 'Aadhaar is required';
            else if (!/^\d{12}$/.test(data.aadhaarNumber)) newErrors.aadhaarNumber = 'Must be 12 digits';
            if (!data.panNumber) newErrors.panNumber = 'PAN is required';
            else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.panNumber)) newErrors.panNumber = 'Invalid PAN format';
        }
        if (step === 7) {
            if (!data.bankName) newErrors.bankName = 'Bank Name is required';
            if (!data.accountNumber) newErrors.accountNumber = 'Account Number is required';
            if (!data.ifscCode) newErrors.ifscCode = 'IFSC Code is required';
        }
        if (step === 9) {
            // Mandatory documents check
            const mandatoryDocs = ['aadhaar_card', 'pan_card', 'resume'];
            const uploadedTypes = data.documents ? data.documents.map((d: any) => d.type) : [];
            const missing = mandatoryDocs.filter(type => !uploadedTypes.includes(type));
            if (missing.length > 0) {
                newErrors.documents = `Please upload mandatory documents: ${missing.join(', ').replace(/_/g, ' ')}`;
            }
        }
        if (step === 10) {
            if (!data.companyPolicyAccepted) newErrors.companyPolicyAccepted = 'Selection required';
            if (!data.ndaAccepted) newErrors.ndaAccepted = 'Selection required';
            if (!data.codeOfConductAccepted) newErrors.codeOfConductAccepted = 'Selection required';
        }
        return newErrors;
    };

    const handleDraft = async () => {
        setLoading(true);
        try {
            await fetch('http://localhost:5000/api/onboarding/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            alert('Draft saved successfully!');
        } catch (error) { console.error('Save draft failed', error); alert('Failed to save draft'); }
        setLoading(false);
    };

    const handleSkip = () => {
        if (currentStep < STEPS.length) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleNext = async () => {
        const stepErrors = getStepErrors(currentStep, formData);
        if (Object.keys(stepErrors).length > 0) {
            setErrors(stepErrors);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setLoading(true);
        // Auto-save draft on next
        try {
            await fetch('http://localhost:5000/api/onboarding/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
        } catch (error) { console.error('Auto-save failed', error); }
        setLoading(false);

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
        // Final full validation check before submission
        let allErrors: any = {};
        for (let i = 1; i <= STEPS.length; i++) {
            allErrors = { ...allErrors, ...getStepErrors(i, formData) };
        }

        if (Object.keys(allErrors).length > 0) {
            setErrors(allErrors);
            alert('Please fix all errors before submitting.');
            // Find first step with error and go there
            for (let i = 1; i <= STEPS.length; i++) {
                if (Object.keys(getStepErrors(i, formData)).length > 0) {
                    setCurrentStep(i);
                    break;
                }
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (!window.confirm('Are you sure you want to submit your onboarding form? This action cannot be undone.')) return;
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/onboarding/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                alert('Onboarding submitted successfully!');
                fetchStatus();
                navigate('/');
            } else {
                alert('Submission failed. Please check all fields.');
            }
        } catch (error) { console.error(error); alert('Network error'); }
        setLoading(false);
    };
    // --- Renderers ---

    // Helper to render the horizontal stepper (Wizard)
    const renderWizard = () => (
        <div className="mb-12 relative px-4">
            <div className="flex items-center justify-between relative">
                {/* Connecting Line */}
                <div
                    className="absolute left-0 right-0 top-5 h-0.5 -z-10 transition-all duration-500"
                    style={{
                        background: `linear-gradient(to right, var(--success) 0%, var(--success) ${((currentStep - 1) / (STEPS.length - 1)) * 100}%, var(--border-color) ${((currentStep - 1) / (STEPS.length - 1)) * 100}%, var(--border-color) 100%)`
                    }}
                />

                {STEPS.map((step) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;

                    return (
                        <div
                            key={step.id}
                            className="flex flex-col items-center relative z-10"
                            style={{ width: `${100 / STEPS.length}%` }}
                        >
                            <div
                                onClick={() => isCompleted || isActive ? null : null} // Keep read-only or allow jumps if needed
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 cursor-default
                                    ${isActive ? 'scale-110 shadow-lg' : ''}`}
                                style={
                                    isActive ? {
                                        backgroundColor: 'var(--primary)',
                                        color: 'white',
                                        boxShadow: '0 0 0 4px rgba(157, 49, 110, 0.2)',
                                        border: '2px solid white'
                                    } : isCompleted ? {
                                        backgroundColor: 'var(--success)',
                                        color: 'white',
                                        border: '2px solid white'
                                    } : {
                                        backgroundColor: 'white',
                                        border: '2px solid var(--border-color)',
                                        color: 'var(--text-muted)'
                                    }
                                }
                            >
                                {isCompleted ? <FaCheckCircle size={16} /> : step.id}
                            </div>
                            <span
                                className={`text-[10px] font-semibold mt-3 text-center transition-colors duration-300 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}
                                style={{ maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                                {step.title.split(' ')[0]}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // --- Content Logic ---

    if (status === 'APPROVED') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="text-center max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                        <FaCheckCircle />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Onboarding Complete!</h1>
                    <p className="text-slate-500 mb-6">Your profile has been approved by the administration. You can now access your dashboard.</p>
                    <button onClick={() => navigate('/')} className="btn-primary w-full justify-center">Go to Dashboard</button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">

            {/* Header */}
            <div className="flex justify-between items-end pb-2">
                <div>
                    <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-main)', fontSize: '1.85rem', marginBottom: '0.25rem' }}>Employee Onboarding</h1>
                    <p className="m-0 text-sm font-medium" style={{ color: 'var(--text-muted)', margin: 0 }}>Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-[var(--bg-surface)] rounded-full border border-[var(--border-color)] shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                    <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">{status}</span>
                </div>
            </div>

            {renderWizard()}

            {/* Main Form Content */}
            <Card className="p-0 overflow-hidden shadow-lg border-0 ring-1 ring-black/5">
                <div className="p-8">
                    {/* Step 1: Personal */}
                    {currentStep === 1 && (
                        <div className="space-y-8">
                            <SectionHeader title="Personal Details" description="Let's start with your basic identity information." />

                            <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                                <div className="shrink-0 mx-auto md:mx-0">
                                    <div className="relative group">
                                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[var(--bg-body)] shadow-md bg-[var(--bg-surface)]">
                                            {formData.profilePhoto ? (
                                                <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-[var(--bg-body)]"><FaUser size={40} /></div>
                                            )}
                                        </div>
                                        <label className="absolute bottom-1 right-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white p-2 rounded-full cursor-pointer shadow-lg transition-transform transform group-hover:scale-110">
                                            <FaCloudUploadAlt />
                                            <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'profilePhoto')} />
                                        </label>
                                    </div>
                                    <p className="text-xs text-center text-[var(--text-muted)] mt-2">Upload Photo</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 w-full">
                                    <div className="md:col-span-2">
                                        <Input label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} error={errors.fullName} required />
                                    </div>
                                    <Input label="Father's Name" name="fatherName" value={formData.fatherName} onChange={handleChange} error={errors.fatherName} required />
                                    <Input label="Mother's Name" name="motherName" value={formData.motherName} onChange={handleChange} />
                                    <Input label="Date of Birth" type="date" name="dateOfBirth" value={formData.dateOfBirth?.split('T')[0]} onChange={handleChange} error={errors.dateOfBirth} required />
                                    <Select label="Gender" name="gender" value={formData.gender} onChange={handleChange} options={['Male', 'Female', 'Other']} error={errors.gender} required />
                                    <Select label="Marital Status" name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} options={['Single', 'Married', 'Divorced', 'Widowed']} error={errors.maritalStatus} required />
                                    <Input label="Nationality" name="nationality" value={formData.nationality} onChange={handleChange} error={errors.nationality} required />
                                    <Select label="Blood Group" name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Contact */}
                    {currentStep === 2 && (
                        <div className="space-y-8">
                            <SectionHeader title="Contact Information" description="How can we reach you?" />

                            <div>
                                <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Primary Contact</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input label="Mobile Number" name="personalMobile" value={formData.personalMobile} onChange={handleChange} error={errors.personalMobile} required />
                                    <Input label="Email Address" type="email" name="personalEmail" value={formData.personalEmail} onChange={handleChange} error={errors.personalEmail} required />
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Current Address</h4>
                                <textarea
                                    name="currentAddress"
                                    rows={3}
                                    className={`input-field w-full ${errors.currentAddress ? 'border-[var(--error)]' : ''}`}
                                    value={formData.currentAddress}
                                    onChange={handleChange}
                                    placeholder="Enter your current residential address..."
                                />
                                {errors.currentAddress && <p className="text-xs text-[var(--error)] mt-1">{errors.currentAddress}</p>}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Permanent Address</h4>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[var(--primary)] transition-opacity hover:opacity-80">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.sameAsCurrentAddress ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'border-[var(--border-color)] bg-white'}`}>
                                            {formData.sameAsCurrentAddress && <FaCheckCircle size={10} />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={formData.sameAsCurrentAddress}
                                            onChange={e => setFormData({ ...formData, sameAsCurrentAddress: e.target.checked, permanentAddress: e.target.checked ? formData.currentAddress : formData.permanentAddress })}
                                        />
                                        Same as Current
                                    </label>
                                </div>
                                {!formData.sameAsCurrentAddress && (
                                    <textarea
                                        name="permanentAddress"
                                        rows={3}
                                        className={`input-field w-full ${errors.permanentAddress ? 'border-[var(--error)]' : ''}`}
                                        value={formData.permanentAddress}
                                        onChange={handleChange}
                                        placeholder="Enter your permanent address..."
                                    />
                                )}
                                {errors.permanentAddress && !formData.sameAsCurrentAddress && <p className="text-xs text-[var(--error)] mt-1">{errors.permanentAddress}</p>}
                            </div>

                            <div>
                                <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Emergency Contacts</h4>
                                {formData.emergencyContacts?.map((contact: any, idx: number) => (
                                    <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-[var(--bg-body)] rounded-lg border border-[var(--border-color)] relative group">
                                        <button onClick={() => removeArrayItem('emergencyContacts', idx)} className="absolute -top-2 -right-2 bg-[var(--error)]/10 text-[var(--error)] p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"><FaTrash size={10} /></button>
                                        <Input label="Name" value={contact.name} onChange={(e: any) => handleArrayChange('emergencyContacts', idx, 'name', e.target.value)} />
                                        <Input label="Relation" value={contact.relationship} onChange={(e: any) => handleArrayChange('emergencyContacts', idx, 'relationship', e.target.value)} />
                                        <Input label="Phone" value={contact.mobile} onChange={(e: any) => handleArrayChange('emergencyContacts', idx, 'mobile', e.target.value)} />
                                    </div>
                                ))}
                                <Button variant="secondary" onClick={() => addArrayItem('emergencyContacts')} className="w-full border-dashed border-2 text-[var(--text-muted)]">
                                    <FaPlus className="mr-2" /> Add Emergency Contact
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Employment */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <SectionHeader title="Employment Details" description="Your role and position at Citrux." />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input label="Department" name="department" value={formData.department} onChange={handleChange} error={errors.department} required placeholder="e.g. Engineering" />
                                <Input label="Designation" name="designation" value={formData.designation} onChange={handleChange} error={errors.designation} required placeholder="e.g. Senior Developer" />
                                <Input label="Date of Joining" type="date" name="dateOfJoining" value={formData.dateOfJoining?.split('T')[0]} onChange={handleChange} error={errors.dateOfJoining} required />
                                <Select label="Work Location" name="workLocation" value={formData.workLocation} onChange={handleChange} options={['Head Office', 'Remote', 'Branch A']} required />
                                <Select label="Employment Type" name="employmentType" value={formData.employmentType} onChange={handleChange} options={['Full Time', 'Part Time', 'Contract']} />
                                <Input label="Work Email" type="email" name="officialEmail" value={formData.officialEmail} onChange={handleChange} placeholder="If assigned already" />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Experience */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <SectionHeader title="Work Experience" description="Previous employment history." />
                            {formData.experiences?.map((exp: any, idx: number) => (
                                <div key={idx} className="p-6 bg-[var(--bg-body)] border border-[var(--border-color)] rounded-xl relative group hover:shadow-md transition-shadow pr-10">
                                    <button onClick={() => removeArrayItem('experiences', idx)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--error)] opacity-0 group-hover:opacity-100 transition-all p-2"><FaTrash /></button>
                                    <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase mb-4">Job {idx + 1}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input label="Company Name" value={exp.companyName} onChange={(e: any) => handleArrayChange('experiences', idx, 'companyName', e.target.value)} />
                                        <Input label="Designation" value={exp.designation} onChange={(e: any) => handleArrayChange('experiences', idx, 'designation', e.target.value)} />
                                        <Input label="Start Date" type="date" value={exp.startDate?.split('T')[0]} onChange={(e: any) => handleArrayChange('experiences', idx, 'startDate', e.target.value)} />
                                        <Input label="End Date" type="date" value={exp.endDate?.split('T')[0]} onChange={(e: any) => handleArrayChange('experiences', idx, 'endDate', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                            <Button variant="secondary" onClick={() => addArrayItem('experiences')} className="w-full border-dashed border-2 text-[var(--text-muted)]">
                                <FaPlus className="mr-2" /> Add Previous Job
                            </Button>
                        </div>
                    )}

                    {/* Step 5: Education */}
                    {currentStep === 5 && (
                        <div className="space-y-6">
                            <SectionHeader title="Education" description="Academic qualifications." />
                            {formData.education?.map((edu: any, idx: number) => (
                                <div key={idx} className="p-6 bg-[var(--bg-body)] border border-[var(--border-color)] rounded-xl relative group hover:shadow-md transition-shadow pr-10">
                                    <button onClick={() => removeArrayItem('education', idx)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--error)] opacity-0 group-hover:opacity-100 transition-all p-2"><FaTrash /></button>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Input label="Institution" value={edu.institutionName} onChange={(e: any) => handleArrayChange('education', idx, 'institutionName', e.target.value)} />
                                        <Input label="Degree / Course" value={edu.degreeOrCourse} onChange={(e: any) => handleArrayChange('education', idx, 'degreeOrCourse', e.target.value)} />
                                        <Input label="Year of Passing" type="number" value={edu.yearOfPassing} onChange={(e: any) => handleArrayChange('education', idx, 'yearOfPassing', e.target.value)} />
                                        <Input label="Grade / Percentage" value={edu.grade} onChange={(e: any) => handleArrayChange('education', idx, 'grade', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                            <Button variant="secondary" onClick={() => addArrayItem('education')} className="w-full border-dashed border-2 text-[var(--text-muted)]">
                                <FaPlus className="mr-2" /> Add Qualification
                            </Button>
                        </div>
                    )}

                    {/* Step 6: Identity */}
                    {currentStep === 6 && (
                        <div className="space-y-6">
                            <SectionHeader title="Identity Documents" description="Government issued identification." />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input label="Aadhaar Number" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} error={errors.aadhaarNumber} placeholder="12 Digit Number" required />
                                <Input label="PAN Number" name="panNumber" value={formData.panNumber} onChange={handleChange} error={errors.panNumber} placeholder="ABCDE1234F" required />
                                <Input label="UAN Number (Optional)" name="uanNumber" value={formData.uanNumber} onChange={handleChange} placeholder="Universal Account Number" />
                            </div>
                        </div>
                    )}

                    {/* Step 7: Bank */}
                    {currentStep === 7 && (
                        <div className="space-y-6">
                            <SectionHeader title="Bank Details" description="For salary credits and reimbursements." />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input label="Bank Name" name="bankName" value={formData.bankName} onChange={handleChange} error={errors.bankName} required />
                                <Input label="Branch Name" name="bankBranch" value={formData.bankBranch} onChange={handleChange} />
                                <Input label="Account Number" name="accountNumber" value={formData.accountNumber} onChange={handleChange} error={errors.accountNumber} required />
                                <Input label="IFSC Code" name="ifscCode" value={formData.ifscCode} onChange={handleChange} error={errors.ifscCode} required />
                            </div>
                        </div>
                    )}

                    {/* Step 8: Health */}
                    {currentStep === 8 && (
                        <div className="space-y-6">
                            <SectionHeader title="Health & Medical" description="Important for emergency situations." />
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-main)] mb-2">Pre-existing Medical Conditions</label>
                                    <textarea className="input-field w-full" rows={3} name="medicalConditions" value={formData.medicalConditions} onChange={handleChange} placeholder="Please list any conditions we should be aware of, or type 'None'." />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-main)] mb-2">Allergies</label>
                                    <textarea className="input-field w-full" rows={3} name="allergies" value={formData.allergies} onChange={handleChange} placeholder="Food or drug allergies..." />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 9: Documents */}
                    {currentStep === 9 && (
                        <div className="space-y-6">
                            <SectionHeader title="Document Uploads" description="Please provide digital copies of the following." />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {['aadhaar_card', 'pan_card', 'cancelled_cheque', 'resume', 'education_certificates', 'experience_letters'].map((docType) => {
                                    const file = formData.documents?.find((d: any) => d.type === docType);
                                    const title = docType.replace(/_/g, ' ').toUpperCase();

                                    return (
                                        <div key={docType} className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all ${file ? 'border-[var(--success)] bg-[var(--success)]/10' : 'border-[var(--border-color)] hover:border-[var(--primary)] hover:bg-[var(--bg-body)]'}`}>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 text-2xl ${file ? 'bg-[var(--success)] text-white' : 'bg-[var(--bg-body)] text-[var(--text-muted)]'}`}>
                                                {file ? <FaCheckCircle /> : <FaCloudUploadAlt />}
                                            </div>
                                            <h4 className="font-bold text-sm text-[var(--text-main)] mb-1">{title}</h4>
                                            <p className="text-xs text-[var(--text-muted)] mb-4">{file ? 'Uploaded Successfully' : 'PDF or JPEG, Max 5MB'}</p>
                                            <label className={`btn-primary px-4 py-2 rounded-lg text-xs font-bold cursor-pointer`}>
                                                {file ? 'Re-upload' : 'Choose File'}
                                                <input type="file" className="hidden" onChange={e => handleFileUpload(e, undefined, docType)} />
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 10: Declarations */}
                    {currentStep >= 10 && (
                        <div className="space-y-6">
                            <SectionHeader title="Final Declarations" description="Review and accept company policies." />
                            <div className="space-y-4">
                                {[
                                    { key: 'companyPolicyAccepted', label: 'Company Policy' },
                                    { key: 'ndaAccepted', label: 'Non-Disclosure Agreement' },
                                    { key: 'codeOfConductAccepted', label: 'Code of Conduct' }
                                ].map((policy) => (
                                    <label key={policy.key} className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all ${formData[policy.key] ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border-color)] hover:bg-[var(--bg-body)]'}`}>
                                        <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${formData[policy.key] ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'border-[var(--text-muted)] bg-white'}`}>
                                            {formData[policy.key] && <FaCheckCircle size={12} />}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={formData[policy.key]} onChange={e => setFormData((p: any) => ({ ...p, [policy.key]: e.target.checked }))} />
                                        <div>
                                            <span className="block font-bold text-[var(--text-main)] text-sm">I accept the {policy.label}</span>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">By checking this, you agree to abide by the terms set forth in the document.</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="px-8 py-6 bg-[var(--bg-body)] border-t border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
                    <Button
                        variant="secondary"
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className="w-full sm:w-auto min-w-[120px]"
                    >
                        <FaChevronLeft className="mr-2" /> Back
                    </Button>

                    <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-center sm:justify-end">
                        <Button
                            variant="secondary"
                            onClick={handleDraft}
                            disabled={loading}
                            className="bg-white"
                        >
                            <FaSave className="mr-2" /> Save Draft
                        </Button>

                        {currentStep < STEPS.length && (
                            <Button
                                variant="secondary"
                                onClick={handleSkip}
                                className="bg-white"
                            >
                                Skip
                            </Button>
                        )}

                        {currentStep === STEPS.length ? (
                            <Button
                                variant="success"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="min-w-[140px]"
                            >
                                {loading ? 'Submitting...' : 'Complete Registration'} <FaCheckCircle className="ml-2" />
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                onClick={handleNext}
                                disabled={loading}
                                className="min-w-[140px]"
                            >
                                Next Step <FaChevronRight className="ml-2" />
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default OnboardingForm;

