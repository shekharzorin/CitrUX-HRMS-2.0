import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const CreateUser: React.FC = () => {
    const { token } = useAuth();
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
                const headers = { Authorization: `Bearer ${token}` };
                const [rolesRes, usersRes] = await Promise.all([
                    fetch('http://localhost:5000/api/job-roles', { headers }),
                    fetch('http://localhost:5000/api/users', { headers })
                ]);

                if (rolesRes.ok) setJobRoles(await rolesRes.json());
                if (usersRes.ok) setManagers(await usersRes.json());
            } catch (error) { console.error(error); }
        };
        fetchData();
    }, [token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                navigate('/users');
            } else {
                alert('Failed to create user');
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="page-container">
            <h1>Create New User</h1>
            <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label>First Name</label>
                            <input name="firstName" className="input-field" onChange={handleChange} required />
                        </div>
                        <div>
                            <label>Last Name</label>
                            <input name="lastName" className="input-field" onChange={handleChange} required />
                        </div>
                    </div>

                    <div>
                        <label>Employee ID <span style={{ fontSize: '0.8em', color: '#6b7280', fontWeight: 'normal' }}>(Optional)</span></label>
                        <input name="employeeId" className="input-field" placeholder="Leave blank to auto-generate (if enabled)" onChange={handleChange} />
                    </div>

                    <div>
                        <label>Email</label>
                        <input name="email" type="email" className="input-field" onChange={handleChange} required />
                    </div>

                    <div>
                        <label>Password</label>
                        <input name="password" type="password" className="input-field" onChange={handleChange} required />
                    </div>

                    <div>
                        <label>Role</label>
                        <select name="role" className="input-field" onChange={handleChange}>
                            <option value="EMPLOYEE">Employee</option>
                            <option value="INTERN">Intern</option>
                            <option value="HR">HR</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    <div>
                        <label>Phone</label>
                        <input name="phone" className="input-field" onChange={handleChange} />
                    </div>

                    <div>
                        <label>Designation</label>
                        <select name="designation" className="input-field" onChange={handleChange} required>
                            <option value="">Select Designation...</option>
                            {jobRoles.map(role => (
                                <option key={role.id} value={role.title}>{role.title}</option>
                            ))}
                            {jobRoles.length === 0 && <option value="Employee">Employee (Default)</option>}
                        </select>
                    </div>

                    <div>
                        <label>Reporting Manager</label>
                        <select name="managerId" className="input-field" onChange={handleChange}>
                            <option value="">None (Top Level)</option>
                            {managers.map(mgr => (
                                <option key={mgr.id} value={mgr.id}>
                                    {mgr.profile?.firstName} {mgr.profile?.lastName} ({mgr.profile?.designation || mgr.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label>Joining Date</label>
                        <input name="joiningDate" type="date" className="input-field" onChange={handleChange} />
                    </div>

                    <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Create User</button>
                </form>
            </div>
        </div>
    );
};

export default CreateUser;
