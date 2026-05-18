import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';

const steps = [
    { id: 1, name: 'Basic Information' },
    { id: 2, name: 'Work Information' },
    { id: 3, name: 'Personal Information' },
    { id: 4, name: 'Address Information' },
    { id: 5, name: 'Emergency Contact' },
    { id: 6, name: 'Documents & Compliance' }
];

const CreateUser: React.FC = () => {
    useAuth();
    const navigate = useNavigate();
    
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const DRAFT_KEY = 'citrux_onboarding_draft';

    const [formData, setFormData] = useState(() => {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return {
            // Basic Info
            firstName: '', lastName: '', email: '', phone: '', password: '', employeeId: '',
            // Work Info
            designation: '', role: 'EMPLOYEE', managerId: '', shiftId: '', joiningDate: '', branchId: '', departmentId: '', employmentType: 'FULL_TIME',
            // Personal Info
            dob: '', nationality: '', bloodGroup: '', gender: '', maritalStatus: '',
            // Address
            presentAddress: '', permanentAddress: '', sameAsPresent: false,
            // Emergency Contact
            emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '', emergencyContactAlternate: '', emergencyContactAddress: '',
            // Documents
            aadhaarNumber: '', panNumber: '', uanNumber: ''
        };
    });

    useEffect(() => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }, [formData]);

    const [jobRoles, setJobRoles] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [filteredDepartments, setFilteredDepartments] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rolesRes, usersRes, shiftsRes, branchesRes, deptsRes] = await Promise.all([
                    api.get<any[]>('/job-roles'),
                    api.get<any[]>('/users'),
                    api.get<any[]>('/shifts'),
                    api.get<any[]>('/organization/branches'),
                    api.get<any[]>('/organization/departments')
                ]);

                if (rolesRes) setJobRoles(rolesRes);
                if (usersRes) setManagers(usersRes);
                if (shiftsRes) setShifts(shiftsRes);
                if (branchesRes) setBranches(branchesRes);
                if (deptsRes) setDepartments(deptsRes);
            } catch (error) { 
                console.error(error); 
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (formData.branchId) {
            setFilteredDepartments(departments.filter(d => d.branchId === formData.branchId || !d.branchId));
        } else {
            setFilteredDepartments(departments);
        }
    }, [formData.branchId, departments]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev: any) => ({ 
                ...prev, 
                [name]: checked,
                permanentAddress: name === 'sameAsPresent' && checked ? prev.presentAddress : prev.permanentAddress
            }));
        } else {
            const finalValue = name === 'panNumber' ? value.toUpperCase() : value;
            setFormData((prev: any) => ({ ...prev, [name]: finalValue }));
        }
    };

    const nextStep = () => {
        if (currentStep < steps.length) setCurrentStep(c => c + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (currentStep !== steps.length) {
            nextStep();
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/users', formData);
            localStorage.removeItem(DRAFT_KEY);
            navigate('/users');
        } catch (error) {
            console.error(error);
            alert('Failed to create user');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="page-container max-w-4xl mx-auto">
            <h1 className="page-title text-2xl font-bold mb-6 text-slate-800 dark:text-white">Employee Onboarding</h1>

            {/* Stepper */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {steps.map((step) => (
                        <div key={step.id} className="flex flex-col items-center relative z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                                currentStep > step.id ? 'bg-indigo-600 text-white' : 
                                currentStep === step.id ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50' : 
                                'bg-slate-200 dark:bg-slate-700 text-slate-500'
                            }`}>
                                {currentStep > step.id ? <Icon name="check_circle" size={16} className="text-white" /> : step.id}
                            </div>
                            <span className="text-xs font-medium mt-2 text-slate-500 hidden sm:block">{step.name}</span>
                        </div>
                    ))}
                    {/* Progress Bar Background */}
                    <div className="absolute top-12 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700 -z-10 px-4">
                        <div 
                            className={`h-full bg-indigo-600 transition-all duration-300 ${
                                currentStep === 1 ? 'w-0' :
                                currentStep === 2 ? 'w-1/5' :
                                currentStep === 3 ? 'w-2/5' :
                                currentStep === 4 ? 'w-3/5' :
                                currentStep === 5 ? 'w-4/5' : 'w-full'
                            }`}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm relative">
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {currentStep === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
                                    <input id="firstName" name="firstName" className="input-field" onChange={handleChange} value={formData.firstName} required placeholder="John" title="First Name" />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
                                    <input id="lastName" name="lastName" className="input-field" onChange={handleChange} value={formData.lastName} required placeholder="Doe" title="Last Name" />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                                    <input id="email" name="email" type="email" className="input-field" onChange={handleChange} value={formData.email} required placeholder="john.doe@company.com" title="Email Address" />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                                    <input id="phone" name="phone" className="input-field" onChange={handleChange} value={formData.phone} placeholder="+91 99999 99999" title="Phone Number" />
                                </div>
                                <div>
                                    <label htmlFor="employeeId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee ID <span className="text-slate-400 font-normal">(Optional)</span></label>
                                    <input id="employeeId" name="employeeId" className="input-field" onChange={handleChange} value={formData.employeeId} placeholder="Auto-generated if blank" title="Employee ID" />
                                </div>
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Temporary Password *</label>
                                    <input id="password" name="password" type="password" className="input-field" onChange={handleChange} value={formData.password} required placeholder="••••••••" title="Temporary Password" />
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Work Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="branchId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Branch *</label>
                                    <select id="branchId" name="branchId" className="input-field" onChange={handleChange} value={formData.branchId} required title="Select Branch">
                                        <option value="">Select Branch...</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="departmentId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department *</label>
                                    <select id="departmentId" name="departmentId" className="input-field" onChange={handleChange} value={formData.departmentId} required title="Select Department">
                                        <option value="">Select Department...</option>
                                        {filteredDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="designation" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Designation *</label>
                                    <select id="designation" name="designation" className="input-field" onChange={handleChange} value={formData.designation} required title="Select Designation">
                                        <option value="">Select Designation...</option>
                                        {jobRoles.map(r => <option key={r.id} value={r.title}>{r.title}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="role" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">System Role</label>
                                    <select id="role" name="role" className="input-field" onChange={handleChange} value={formData.role} title="Select System Role">
                                        <option value="EMPLOYEE">Employee</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="HR">HR</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="managerId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reporting Manager</label>
                                    <select id="managerId" name="managerId" className="input-field" onChange={handleChange} value={formData.managerId} title="Select Reporting Manager">
                                        <option value="">None (Top Level)</option>
                                        {managers.map(m => <option key={m.id} value={m.id}>{m.profile?.firstName} {m.profile?.lastName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="shiftId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Work Shift</label>
                                    <select id="shiftId" name="shiftId" className="input-field" onChange={handleChange} value={formData.shiftId} title="Select Work Shift">
                                        <option value="">Select Shift...</option>
                                        {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="joiningDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Joining Date</label>
                                    <input id="joiningDate" name="joiningDate" type="date" className="input-field" onChange={handleChange} value={formData.joiningDate} title="Joining Date" placeholder="YYYY-MM-DD" />
                                </div>
                                <div>
                                    <label htmlFor="employmentType" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employment Type</label>
                                    <select id="employmentType" name="employmentType" className="input-field" onChange={handleChange} value={formData.employmentType} title="Select Employment Type">
                                        <option value="FULL_TIME">Full Time</option>
                                        <option value="PART_TIME">Part Time</option>
                                        <option value="CONTRACT">Contract</option>
                                        <option value="INTERN">Internship</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="dob" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                                    <input id="dob" name="dob" type="date" className="input-field" onChange={handleChange} value={formData.dob} title="Date of Birth" placeholder="YYYY-MM-DD" />
                                </div>
                                <div>
                                    <label htmlFor="nationality" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nationality</label>
                                    <input id="nationality" name="nationality" className="input-field" onChange={handleChange} value={formData.nationality} placeholder="e.g. Indian" title="Nationality" />
                                </div>
                                <div>
                                    <label htmlFor="gender" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                                    <select id="gender" name="gender" className="input-field" onChange={handleChange} value={formData.gender} title="Select Gender">
                                        <option value="">Select Gender...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="bloodGroup" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Blood Group</label>
                                    <select id="bloodGroup" name="bloodGroup" className="input-field" onChange={handleChange} value={formData.bloodGroup} title="Select Blood Group">
                                        <option value="">Select Blood Group...</option>
                                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                                            <option key={bg} value={bg}>{bg}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="maritalStatus" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Marital Status</label>
                                    <select id="maritalStatus" name="maritalStatus" className="input-field" onChange={handleChange} value={formData.maritalStatus} title="Select Marital Status">
                                        <option value="">Select Status...</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Divorced">Divorced</option>
                                        <option value="Widowed">Widowed</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Address Information</h3>
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="presentAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Present Address</label>
                                    <textarea id="presentAddress" name="presentAddress" rows={3} className="input-field" onChange={handleChange} value={formData.presentAddress} placeholder="Enter full present address..." title="Present Address" />
                                </div>
                                
                                <label htmlFor="sameAsPresent" className="flex items-center gap-2 cursor-pointer w-fit">
                                    <input id="sameAsPresent" type="checkbox" name="sameAsPresent" checked={formData.sameAsPresent} onChange={handleChange} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" title="Same as present address" />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Permanent address is same as present address</span>
                                </label>
                                
                                <div>
                                    <label htmlFor="permanentAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Permanent Address</label>
                                    <textarea id="permanentAddress" name="permanentAddress" rows={3} className="input-field" onChange={handleChange} value={formData.permanentAddress} disabled={formData.sameAsPresent} placeholder="Enter full permanent address..." title="Permanent Address" />
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Emergency Contact</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="emergencyContactName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Name *</label>
                                    <input id="emergencyContactName" name="emergencyContactName" className="input-field" onChange={handleChange} value={formData.emergencyContactName} required placeholder="Full Name" title="Emergency Contact Name" />
                                </div>
                                <div>
                                    <label htmlFor="emergencyContactRelation" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Relationship</label>
                                    <input id="emergencyContactRelation" name="emergencyContactRelation" className="input-field" onChange={handleChange} value={formData.emergencyContactRelation} placeholder="e.g. Father, Spouse" title="Emergency Contact Relationship" />
                                </div>
                                <div>
                                    <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
                                    <input id="emergencyContactPhone" name="emergencyContactPhone" className="input-field" onChange={handleChange} value={formData.emergencyContactPhone} required placeholder="+91 99999 99999" title="Emergency Contact Phone" />
                                </div>
                                <div>
                                    <label htmlFor="emergencyContactAlternate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alternate Number</label>
                                    <input id="emergencyContactAlternate" name="emergencyContactAlternate" className="input-field" onChange={handleChange} value={formData.emergencyContactAlternate} placeholder="Optional" title="Emergency Contact Alternate Phone" />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="emergencyContactAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Address</label>
                                    <textarea id="emergencyContactAddress" name="emergencyContactAddress" rows={2} className="input-field" onChange={handleChange} value={formData.emergencyContactAddress} placeholder="Permanent address of contact..." title="Emergency Contact Address" />
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 6 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Documents & Compliance</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="aadhaarNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Aadhaar Number</label>
                                    <input id="aadhaarNumber" name="aadhaarNumber" className="input-field tracking-widest font-mono" onChange={handleChange} value={formData.aadhaarNumber} placeholder="XXXX XXXX XXXX" maxLength={12} pattern="[0-9]{12}" title="12 digit numeric Aadhaar number" />
                                </div>
                                <div>
                                    <label htmlFor="panNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">PAN Number</label>
                                    <input id="panNumber" name="panNumber" className="input-field uppercase font-mono tracking-wider" onChange={handleChange} value={formData.panNumber} placeholder="ABCDE1234F" maxLength={10} pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}" title="Valid 10 character PAN format" />
                                </div>
                                <div>
                                    <label htmlFor="uanNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">UAN Number</label>
                                    <input id="uanNumber" name="uanNumber" className="input-field font-mono tracking-wider" onChange={handleChange} value={formData.uanNumber} placeholder="12 Digit UAN" maxLength={12} title="12 digit numeric UAN number" />
                                </div>
                            </div>
                            
                            <div className="mt-8 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl flex gap-3">
                                <div className="text-indigo-600 dark:text-indigo-400 mt-0.5">ℹ️</div>
                                <div className="text-sm text-indigo-900 dark:text-indigo-300">
                                    <p className="font-semibold mb-1">Future Upload Support Prepared</p>
                                    <p>The system is ready for document uploads (Aadhaar copy, PAN copy, Passport photo). The backend models and UI sections are initialized for file handling.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between pt-8 border-t border-slate-100 dark:border-slate-800 mt-8">
                        <button 
                            type="button" 
                            onClick={prevStep} 
                            disabled={currentStep === 1 || isSubmitting}
                            className="btn-secondary flex items-center gap-2 px-6 disabled:opacity-50"
                        >
                            <Icon name="chevron_left" size={16} /> Back
                        </button>
                        
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    localStorage.removeItem(DRAFT_KEY);
                                    navigate('/users');
                                }}
                                className="px-6 py-2 rounded-xl text-slate-500 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            
                            {currentStep < steps.length ? (
                                <button type="submit" className="btn-primary flex items-center gap-2 px-8 shadow-lg shadow-indigo-500/20">
                                    Next <Icon name="chevron_right" size={16} />
                                </button>
                            ) : (
                                <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2 px-8 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 text-white">
                                    <Icon name="save" size={16} /> {isSubmitting ? 'Creating...' : 'Submit Profile'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateUser;
