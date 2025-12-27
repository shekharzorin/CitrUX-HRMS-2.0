import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const CreateUser: React.FC = () => {
    const { token: _token } = useAuth(); // Keeping token for consistency if needed by other logic, though api service handles it.
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'EMPLOYEE',
        firstName: '',
        lastName: '',
        phone: '',
        designation: '',
        joiningDate: ''
    });

    const [jobRoles, setJobRoles] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [rolesData, usersData] = await Promise.all([
                    api.get<any[]>('/job-roles'),
                    api.get<any[]>('/users')
                ]);

                if (rolesData) setJobRoles(rolesData);
                if (usersData) setManagers(usersData);
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
            <h1>Create New User</h1>
            <div className="glass-panel form-container">
                <form onSubmit={handleSubmit} className="form-layout">
                    <div className="form-grid-2col">
                        <div>
                            <label htmlFor="firstName" className="form-label">First Name</label>
                            <input id="firstName" name="firstName" className="input-field" onChange={handleChange} required placeholder="Enter first name" />
                        </div>
                        <div>
                            <label htmlFor="lastName" className="form-label">Last Name</label>
                            <input id="lastName" name="lastName" className="input-field" onChange={handleChange} required placeholder="Enter last name" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="employeeId" className="form-label">Employee ID <span className="label-hint">(Optional)</span></label>
                        <input id="employeeId" name="employeeId" className="input-field" placeholder="Leave blank to auto-generate (if enabled)" onChange={handleChange} />
                    </div>

                    <div>
                        <label htmlFor="email" className="form-label">Email</label>
                        <input id="email" name="email" type="email" className="input-field" onChange={handleChange} required placeholder="Enter email address" />
                    </div>

                    <div>
                        <label htmlFor="password" className="form-label">Password</label>
                        <input id="password" name="password" type="password" className="input-field" onChange={handleChange} required placeholder="Enter temporary password" />
                    </div>

                    <div>
                        <label htmlFor="role" className="form-label">Role</label>
                        <select id="role" name="role" className="input-field" onChange={handleChange} title="Select Role">
                            <option value="EMPLOYEE">Employee</option>
                            <option value="INTERN">Intern</option>
                            <option value="HR">HR</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="phone" className="form-label">Phone</label>
                        <input id="phone" name="phone" className="input-field" onChange={handleChange} placeholder="Enter phone number" />
                    </div>

                    <div>
                        <label htmlFor="designation" className="form-label">Designation</label>
                        <select id="designation" name="designation" className="input-field" onChange={handleChange} required title="Select Designation">
                            <option value="">Select Designation...</option>
                            {jobRoles.map(role => (
                                <option key={role.id} value={role.title}>{role.title}</option>
                            ))}
                            {jobRoles.length === 0 && <option value="Employee">Employee (Default)</option>}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="managerId" className="form-label">Reporting Manager</label>
                        <select id="managerId" name="managerId" className="input-field" onChange={handleChange} title="Select Reporting Manager">
                            <option value="">None (Top Level)</option>
                            {managers.map(mgr => (
                                <option key={mgr.id} value={mgr.id}>
                                    {mgr.profile?.firstName} {mgr.profile?.lastName} ({mgr.profile?.designation || mgr.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="joiningDate" className="form-label">Joining Date</label>
                        <input id="joiningDate" name="joiningDate" type="date" className="input-field" onChange={handleChange} title="Select Joining Date" />
                    </div>

                    <button type="submit" className="btn-primary btn-submit">Create User</button>
                </form>
            </div>
        </div>
    );
};

export default CreateUser;
