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
    });

    useEffect(() => {
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
                        <input name="designation" className="input-field" value={formData.designation} onChange={handleChange} />
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
