import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

const EditUser: React.FC = () => {
    const { token } = useAuth();
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
        // ... (fetchData logic kept same, simplified replacement) ...
        const fetchData = async () => {
            // ... existing fetch logic for roles/managers ...
            try {
                const headers = { Authorization: `Bearer ${token}` };
                const [rolesRes, usersRes] = await Promise.all([
                    fetch('http://localhost:5000/api/job-roles', { headers }),
                    fetch('http://localhost:5000/api/users', { headers })
                ]);

                if (rolesRes.ok) setJobRoles(await rolesRes.json());
                if (usersRes.ok) {
                    const allUsers = await usersRes.json();
                    setManagers(allUsers.filter((u: any) => u.id !== id));
                }
            } catch (error) { console.error(error); }
        };
        fetchData();

        const fetchUser = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/users/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();
                if (response.ok) {
                    setFormData({
                        role: data.role,
                        firstName: data.profile?.firstName || '',
                        lastName: data.profile?.lastName || '',
                        phone: data.profile?.phone || '',
                        designation: data.profile?.designation || '',
                        managerId: data.managerId || '',
                        employeeId: data.employeeId || ''
                    });
                }
            } catch (error) {
                console.error('Error fetching user:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchUser();
    }, [id, token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`http://localhost:5000/api/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                navigate('/users');
            } else {
                alert('Failed to update user');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating user');
        }
    };

    if (loading) return <div className="page-container">Loading...</div>;

    return (
        <div className="page-container">
            <h1 style={{ marginBottom: '1.5rem' }}>Edit Employee</h1>
            <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', background: 'white' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>First Name</label>
                            <input name="firstName" className="input-field" value={formData.firstName} onChange={handleChange} required />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Last Name</label>
                            <input name="lastName" className="input-field" value={formData.lastName} onChange={handleChange} required />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Employee ID</label>
                        <input name="employeeId" className="input-field" value={formData.employeeId} onChange={handleChange} placeholder="Optional" />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Role</label>
                        <select name="role" className="input-field" value={formData.role} onChange={handleChange}>
                            <option value="EMPLOYEE">Employee</option>
                            <option value="INTERN">Intern</option>
                            <option value="HR">HR</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Phone</label>
                        <input name="phone" className="input-field" value={formData.phone} onChange={handleChange} />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Designation</label>
                        <select name="designation" className="input-field" value={formData.designation} onChange={handleChange} required>
                            <option value="">Select Designation...</option>
                            {jobRoles.map(role => (
                                <option key={role.id} value={role.title}>{role.title}</option>
                            ))}
                            {jobRoles.length === 0 && <option value="Employee">Employee (Default)</option>}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Reporting Manager</label>
                        <select name="managerId" className="input-field" value={formData.managerId} onChange={handleChange}>
                            <option value="">None (Top Level)</option>
                            {managers.map(mgr => (
                                <option key={mgr.id} value={mgr.id}>
                                    {mgr.profile?.firstName} {mgr.profile?.lastName} ({mgr.profile?.designation || mgr.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" className="btn-primary">Save Changes</button>
                        <button
                            type="button"
                            className="btn-primary"
                            style={{ background: 'white', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: 'none' }}
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
