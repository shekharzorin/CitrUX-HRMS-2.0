import React, { useState, useEffect } from 'react';
import { useAuth, type User } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';

const EditUser: React.FC = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        role: 'EMPLOYEE',
        firstName: '',
        lastName: '',
        phone: '',
        designation: '',
        managerId: '',
        employeeId: '',
        dob: '',
        email: '',
        shiftId: ''
    });

    const [jobRoles, setJobRoles] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rolesData, usersData, shiftsData] = await Promise.all([
                    api.get<any[]>('/job-roles'),
                    api.get<any[]>('/users'),
                    api.get<any[]>('/shifts')
                ]);

                if (rolesData) setJobRoles(rolesData);
                if (usersData && id) {
                    setManagers(usersData.filter((u: any) => u.id !== id));
                }
                if (shiftsData) setShifts(shiftsData);
            } catch (error) { console.error(error); }
        };
        fetchData();

        const fetchUser = async () => {
            try {
                const data = await api.get<any>(`/users/${id}`);
                setFormData({
                    role: data.role,
                    firstName: data.profile?.firstName || '',
                    lastName: data.profile?.lastName || '',
                    phone: data.profile?.phone || '',
                    designation: data.profile?.designation || '',
                    managerId: data.managerId || '',
                    employeeId: data.employeeId || '',
                    dob: data.profile?.dob ? new Date(data.profile.dob).toISOString().split('T')[0] : '',
                    email: data.email || '',
                    shiftId: data.shift?.id || ''
                });
            } catch (error) {
                console.error('Error fetching user:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchUser();
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const updatedUser = await api.put<User>(`/users/${id}`, formData);

            // If admin is editing their own profile, update local auth state
            // Note: We need to ensure we map the response correctly to the user context structure
            // The AuthContext expects a specific structure, so we might need to fetch the profile or construct it.
            // For safety, let's just update if the ID matches.
            // We can't access 'user' directly inside this function if it's not in scope or fresh, 
            // but we can access the 'user' from useAuth() hook which we need to destructure properly.

            // If editing self, update context
            if (user && id === user.id && updateUser) {
                // Fetch the updated user data to be sure
                // Or just use the response if api returns it.
                // Assuming api.put returns the updated user object with profile
                // user.controller.ts typically returns the updated user.
                if (updatedUser && updatedUser.id) {
                    updateUser(updatedUser as User);
                }
            }

            navigate('/users');
        } catch (error) {
            console.error(error);
            alert('Failed to update user');
        }
    };

    if (loading) return <div className="page-container flex items-center justify-center min-h-[500px]">Loading...</div>;

    return (
        <div className="page-container">
            <h1 className="page-title text-2xl font-bold mb-6 text-slate-800 dark:text-white">Edit Employee</h1>

            <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Section: Personal Details */}
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Personal Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="firstName" className="form-label">First Name</label>
                                <input id="firstName" name="firstName" className="input-field" value={formData.firstName} onChange={handleChange} required placeholder="Enter first name" />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="form-label">Last Name</label>
                                <input id="lastName" name="lastName" className="input-field" value={formData.lastName} onChange={handleChange} required placeholder="Enter last name" />
                            </div>
                            <div>
                                <label htmlFor="email" className="form-label">Email Address</label>
                                <input id="email" name="email" type="email" className="input-field bg-slate-50" value={formData.email} disabled title="Email cannot be changed" />
                            </div>
                            <div>
                                <label htmlFor="phone" className="form-label">Phone Number</label>
                                <input id="phone" name="phone" className="input-field" value={formData.phone} onChange={handleChange} placeholder="Enter phone number" />
                            </div>
                            <div>
                                <label htmlFor="dob" className="form-label">Date of Birth</label>
                                <input id="dob" name="dob" type="date" className="input-field" value={formData.dob} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-6"></div>

                    {/* Section: Employment Details */}
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Employment Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="designation" className="form-label">Designation</label>
                                <select id="designation" name="designation" className="input-field" value={formData.designation} onChange={handleChange} required title="Select Designation">
                                    <option value="">Select Designation...</option>
                                    {jobRoles.map(role => (
                                        <option key={role.id} value={role.title}>{role.title}</option>
                                    ))}
                                    {jobRoles.length === 0 && <option value="Employee">Employee (Default)</option>}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="role" className="form-label">System Role</label>
                                <select id="role" name="role" className="input-field" value={formData.role} onChange={handleChange} title="Select Role">
                                    <option value="EMPLOYEE">Employee</option>
                                    <option value="INTERN">Intern</option>
                                    <option value="HR">HR</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="managerId" className="form-label">Reporting Manager</label>
                                <select id="managerId" name="managerId" className="input-field" value={formData.managerId} onChange={handleChange} title="Select Reporting Manager">
                                    <option value="">None (Top Level)</option>
                                    {managers.map(mgr => (
                                        <option key={mgr.id} value={mgr.id}>
                                            {mgr.profile?.firstName} {mgr.profile?.lastName} ({mgr.profile?.designation || mgr.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="shiftId" className="form-label">Work Shift</label>
                                <select id="shiftId" name="shiftId" className="input-field" value={formData.shiftId} onChange={handleChange} title="Select Work Shift">
                                    <option value="">Select Shift...</option>
                                    {shifts.map(shift => (
                                        <option key={shift.id} value={shift.id}>
                                            {shift.name} ({shift.startTime} - {shift.endTime})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="employeeId" className="form-label">Employee ID</label>
                                <input id="employeeId" name="employeeId" className="input-field" value={formData.employeeId} onChange={handleChange} placeholder="Optional" />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-6"></div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-4">
                        <button type="submit" className="btn-primary px-8 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                            Save Changes
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
