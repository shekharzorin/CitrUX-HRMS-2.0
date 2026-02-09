import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const CreateUser: React.FC = () => {
    useAuth(); // Ensure context subscription
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'EMPLOYEE',
        firstName: '',
        lastName: '',
        phone: '',
        designation: '',
        joiningDate: '',
        shiftId: ''
    });

    const [jobRoles, setJobRoles] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [rolesData, usersData, shiftsData] = await Promise.all([
                    api.get<any[]>('/job-roles'),
                    api.get<any[]>('/users'),
                    api.get<any[]>('/shifts')
                ]);

                if (rolesData) setJobRoles(rolesData);
                if (usersData) setManagers(usersData);
                if (shiftsData) setShifts(shiftsData);
            } catch (error) { console.error(error); }
        };
        fetchData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/users', formData);
            navigate('/users');
        } catch (error) {
            console.error(error);
            alert('Failed to create user');
        }
    };

    return (
        <div className="page-container">
            <h1 className="page-title text-2xl font-bold mb-6 text-slate-800 dark:text-white">Create New Employee</h1>

            <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Section: Personal Details */}
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Personal Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                                <input id="firstName" name="firstName" className="input-field" onChange={handleChange} required placeholder="John" />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                                <input id="lastName" name="lastName" className="input-field" onChange={handleChange} required placeholder="Doe" />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                                <input id="email" name="email" type="email" className="input-field" onChange={handleChange} required placeholder="john.doe@company.com" />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                                <input id="phone" name="phone" className="input-field" onChange={handleChange} placeholder="+91 99999 99999" />
                            </div>
                            <div>
                                <label htmlFor="dob" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                                <input id="dob" name="dob" type="date" className="input-field" onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-6"></div>

                    {/* Section: Employment Details */}
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Employment Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="designation" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Designation</label>
                                <select id="designation" name="designation" className="input-field" onChange={handleChange} required>
                                    <option value="">Select Designation...</option>
                                    {jobRoles.map(role => (
                                        <option key={role.id} value={role.title}>{role.title}</option>
                                    ))}
                                    {jobRoles.length === 0 && <option value="Employee">Employee (Default)</option>}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">System Role</label>
                                <select id="role" name="role" className="input-field" onChange={handleChange}>
                                    <option value="EMPLOYEE">Employee</option>
                                    <option value="INTERN">Intern</option>
                                    <option value="HR">HR</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="managerId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reporting Manager</label>
                                <select id="managerId" name="managerId" className="input-field" onChange={handleChange}>
                                    <option value="">None (Top Level)</option>
                                    {managers.map(mgr => (
                                        <option key={mgr.id} value={mgr.id}>
                                            {mgr.profile?.firstName} {mgr.profile?.lastName} ({mgr.profile?.designation || mgr.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="shiftId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Work Shift</label>
                                <select id="shiftId" name="shiftId" className="input-field" onChange={handleChange}>
                                    <option value="">Select Shift...</option>
                                    {shifts.map(shift => (
                                        <option key={shift.id} value={shift.id}>
                                            {shift.name} ({shift.startTime} - {shift.endTime})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="joiningDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Joining Date</label>
                                <input id="joiningDate" name="joiningDate" type="date" className="input-field" onChange={handleChange} />
                            </div>
                            <div>
                                <label htmlFor="employeeId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Employee ID <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                                </label>
                                <input id="employeeId" name="employeeId" className="input-field" placeholder="Auto-generated if blank" onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-6"></div>

                    {/* Section: Account Security */}
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Security</h3>
                        <div className="max-w-md">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Temporary Password</label>
                            <input id="password" name="password" type="password" className="input-field" onChange={handleChange} required placeholder="••••••••" />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-4">
                        <button type="submit" className="btn-primary px-8 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                            Create Employee
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

export default CreateUser;
