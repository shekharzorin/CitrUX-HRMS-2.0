import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';

const EditUser: React.FC = () => {
    const { token: _token } = useAuth();
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
        employeeId: ''
    });

    const [jobRoles, setJobRoles] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rolesData, usersData] = await Promise.all([
                    api.get<any[]>('/job-roles'),
                    api.get<any[]>('/users')
                ]);

                if (rolesData) setJobRoles(rolesData);
                if (usersData && id) {
                    setManagers(usersData.filter((u: any) => u.id !== id));
                }
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
                    employeeId: data.employeeId || ''
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
            await api.put(`/users/${id}`, formData);
            navigate('/users');
        } catch (error) {
            console.error(error);
            alert('Failed to update user');
        }
    };

    if (loading) return <div className="page-container">Loading...</div>;

    return (
        <div className="page-container">
            <h1 className="page-title">Edit Employee</h1>
            <div className="glass-panel form-container">
                <form onSubmit={handleSubmit} className="form-layout">
                    <div className="form-grid-2col">
                        <div>
                            <label htmlFor="firstName" className="form-label">First Name</label>
                            <input id="firstName" name="firstName" className="input-field" value={formData.firstName} onChange={handleChange} required placeholder="Enter first name" />
                        </div>
                        <div>
                            <label htmlFor="lastName" className="form-label">Last Name</label>
                            <input id="lastName" name="lastName" className="input-field" value={formData.lastName} onChange={handleChange} required placeholder="Enter last name" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="employeeId" className="form-label">Employee ID</label>
                        <input id="employeeId" name="employeeId" className="input-field" value={formData.employeeId} onChange={handleChange} placeholder="Optional" />
                    </div>

                    <div>
                        <label htmlFor="role" className="form-label">Role</label>
                        <select id="role" name="role" className="input-field" value={formData.role} onChange={handleChange} title="Select Role">
                            <option value="EMPLOYEE">Employee</option>
                            <option value="INTERN">Intern</option>
                            <option value="HR">HR</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="phone" className="form-label">Phone</label>
                        <input id="phone" name="phone" className="input-field" value={formData.phone} onChange={handleChange} placeholder="Enter phone number" />
                    </div>

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

                    <div className="form-actions">
                        <button type="submit" className="btn-primary">Save Changes</button>
                        <button
                            type="button"
                            className="btn-primary btn-cancel"
                            onClick={() => navigate('/users')}
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
