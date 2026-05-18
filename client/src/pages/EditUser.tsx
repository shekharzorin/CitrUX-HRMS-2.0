import React, { useState, useEffect } from 'react';
import { useAuth, type User } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';

const EditUser: React.FC = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        // Basic Info
        firstName: '', lastName: '', email: '', phone: '', employeeId: '',
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
    });

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
                if (usersRes && id) {
                    setManagers(usersRes.filter((u: any) => u.id !== id));
                }
                if (shiftsRes) setShifts(shiftsRes);
                if (branchesRes) setBranches(branchesRes);
                if (deptsRes) setDepartments(deptsRes);
            } catch (error) { console.error(error); }
        };
        fetchData();

        const fetchUser = async () => {
            try {
                const data = await api.get<any>(`/users/${id}`);
                setFormData({
                    firstName: data.profile?.firstName || '',
                    lastName: data.profile?.lastName || '',
                    email: data.email || '',
                    phone: data.profile?.phone || '',
                    employeeId: data.employeeId || '',
                    
                    designation: data.profile?.designation || '',
                    role: data.role || 'EMPLOYEE',
                    managerId: data.managerId || '',
                    shiftId: data.shift?.id || '',
                    joiningDate: data.profile?.dateOfJoining ? new Date(data.profile.dateOfJoining).toISOString().split('T')[0] : '',
                    branchId: data.profile?.branchId || '',
                    departmentId: data.profile?.departmentId || '',
                    employmentType: data.profile?.employmentType || 'FULL_TIME',
                    
                    dob: data.profile?.dob ? new Date(data.profile.dob).toISOString().split('T')[0] : '',
                    nationality: data.profile?.nationality || '',
                    bloodGroup: data.profile?.bloodGroup || '',
                    gender: data.profile?.gender || '',
                    maritalStatus: data.profile?.maritalStatus || '',
                    
                    presentAddress: data.profile?.presentAddress || '',
                    permanentAddress: data.profile?.permanentAddress || '',
                    sameAsPresent: data.profile?.presentAddress === data.profile?.permanentAddress && !!data.profile?.presentAddress,
                    
                    emergencyContactName: data.profile?.emergencyContactName || '',
                    emergencyContactRelation: data.profile?.emergencyContactRelation || '',
                    emergencyContactPhone: data.profile?.emergencyContactPhone || '',
                    emergencyContactAlternate: data.profile?.emergencyContactAlternate || '',
                    emergencyContactAddress: data.profile?.emergencyContactAddress || '',
                    
                    aadhaarNumber: data.profile?.aadhaarNumber || '',
                    panNumber: data.profile?.panNumber || '',
                    uanNumber: data.profile?.uanNumber || ''
                });
            } catch (error) {
                console.error('Error fetching user:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchUser();
    }, [id]);

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
            setFormData(prev => ({ 
                ...prev, 
                [name]: checked,
                permanentAddress: name === 'sameAsPresent' && checked ? prev.presentAddress : prev.permanentAddress
            }));
        } else {
            const finalValue = name === 'panNumber' ? value.toUpperCase() : value;
            setFormData(prev => ({ ...prev, [name]: finalValue }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const updatedUser = await api.put<User>(`/users/${id}`, formData);

            if (user && id === user.id && updateUser) {
                if (updatedUser && updatedUser.id) {
                    updateUser(updatedUser as User);
                }
            }

            navigate('/users');
        } catch (error) {
            console.error(error);
            alert('Failed to update user');
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="page-container flex items-center justify-center min-h-[500px]">Loading...</div>;

    return (
        <div className="page-container max-w-5xl mx-auto">
            <h1 className="page-title text-2xl font-bold mb-6 text-slate-800 dark:text-white">Edit Employee Profile</h1>

            <div className="glass-panel p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-10">

                    {/* Section 1: Basic Information */}
                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Basic Information</h3>
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
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address (Read-only)</label>
                                <input id="email" name="email" type="email" className="input-field bg-slate-50 opacity-80" value={formData.email} disabled placeholder="john.doe@company.com" title="Email Address" />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                                <input id="phone" name="phone" className="input-field" onChange={handleChange} value={formData.phone} placeholder="+91 99999 99999" title="Phone Number" />
                            </div>
                            <div>
                                <label htmlFor="employeeId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee ID</label>
                                <input id="employeeId" name="employeeId" className="input-field" onChange={handleChange} value={formData.employeeId} placeholder="Auto-generated if blank" title="Employee ID" />
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Work Information */}
                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Work Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="branchId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Branch</label>
                                <select id="branchId" name="branchId" className="input-field" onChange={handleChange} value={formData.branchId} title="Select Branch">
                                    <option value="">Select Branch...</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="departmentId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
                                <select id="departmentId" name="departmentId" className="input-field" onChange={handleChange} value={formData.departmentId} title="Select Department">
                                    <option value="">Select Department...</option>
                                    {filteredDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="designation" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Designation</label>
                                <select id="designation" name="designation" className="input-field" onChange={handleChange} value={formData.designation} title="Select Designation">
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
                    </section>

                    {/* Section 3: Personal Information */}
                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Personal Information</h3>
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
                    </section>

                    {/* Section 4: Address Information */}
                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Address Information</h3>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="presentAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Present Address</label>
                                <textarea id="presentAddress" name="presentAddress" rows={2} className="input-field" onChange={handleChange} value={formData.presentAddress} placeholder="Enter full present address..." title="Present Address" />
                            </div>
                            <label htmlFor="sameAsPresent" className="flex items-center gap-2 cursor-pointer w-fit">
                                <input id="sameAsPresent" type="checkbox" name="sameAsPresent" checked={formData.sameAsPresent} onChange={handleChange} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" title="Same as present address" />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Permanent address is same as present address</span>
                            </label>
                            <div>
                                <label htmlFor="permanentAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Permanent Address</label>
                                <textarea id="permanentAddress" name="permanentAddress" rows={2} className="input-field" onChange={handleChange} value={formData.permanentAddress} disabled={formData.sameAsPresent} placeholder="Enter full permanent address..." title="Permanent Address" />
                            </div>
                        </div>
                    </section>

                    {/* Section 5: Emergency Contact */}
                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Emergency Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="emergencyContactName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Name</label>
                                <input id="emergencyContactName" name="emergencyContactName" className="input-field" onChange={handleChange} value={formData.emergencyContactName} placeholder="Full Name" title="Emergency Contact Name" />
                            </div>
                            <div>
                                <label htmlFor="emergencyContactRelation" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Relationship</label>
                                <input id="emergencyContactRelation" name="emergencyContactRelation" className="input-field" onChange={handleChange} value={formData.emergencyContactRelation} placeholder="e.g. Father, Spouse" title="Emergency Contact Relationship" />
                            </div>
                            <div>
                                <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                                <input id="emergencyContactPhone" name="emergencyContactPhone" className="input-field" onChange={handleChange} value={formData.emergencyContactPhone} placeholder="+91 99999 99999" title="Emergency Contact Phone Number" />
                            </div>
                            <div>
                                <label htmlFor="emergencyContactAlternate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alternate Number</label>
                                <input id="emergencyContactAlternate" name="emergencyContactAlternate" className="input-field" onChange={handleChange} value={formData.emergencyContactAlternate} placeholder="Optional" title="Emergency Contact Alternate Number" />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="emergencyContactAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Address</label>
                                <textarea id="emergencyContactAddress" name="emergencyContactAddress" rows={2} className="input-field" onChange={handleChange} value={formData.emergencyContactAddress} placeholder="Permanent address of contact..." title="Emergency Contact Address" />
                            </div>
                        </div>
                    </section>

                    {/* Section 6: Documents & Compliance */}
                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Documents & Compliance</h3>
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
                    </section>

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <button type="submit" disabled={isSubmitting} className="btn-primary px-8 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/users')}
                            className="px-6 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUser;
