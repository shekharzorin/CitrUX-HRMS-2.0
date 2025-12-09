import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Users: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;

        setDeletingId(id);
        try {
            const response = await fetch(`http://localhost:5000/api/users/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                setUsers(users.filter(u => u.id !== id));
            } else {
                alert('Failed to delete user');
            }
        } catch (error) {
            console.error(error);
            alert('Error deleting user');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.profile?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        user.profile?.lastName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>User Management</h1>
                    <p>Manage access and update employee information.</p>
                </div>
                <Link to="/users/create" className="btn-primary" style={{ textDecoration: 'none' }}>+ Add Employee</Link>
            </div>

            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    className="input-field"
                    style={{ maxWidth: '300px', background: 'white' }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', background: 'white' }}>
                {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text)' }}>
                        <thead style={{ background: '#F9FAFB', borderBottom: '1px solid var(--border)' }}>
                            <tr style={{ textAlign: 'left' }}>
                                <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Employee Name</th>
                                <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Role</th>
                                <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Phone</th>
                                <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Designation</th>
                                <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E0E7FF', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                                                {user.profile?.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 500, color: '#111827' }}>{user.profile?.firstName} {user.profile?.lastName}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            background: user.role === 'ADMIN' ? '#FEF3C7' : user.role === 'HR' ? '#DBEAFE' : '#ECFDF5',
                                            color: user.role === 'ADMIN' ? '#D97706' : user.role === 'HR' ? '#2563EB' : '#059669',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            display: 'inline-block'
                                        }}>{user.role}</span>
                                    </td>
                                    <td style={{ padding: '1rem', color: '#374151' }}>{user.profile?.phone || '-'}</td>
                                    <td style={{ padding: '1rem', color: '#374151' }}>{user.profile?.designation || '-'}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <Link to={`/users/edit/${user.id}`} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'white', color: 'var(--primary)', border: '1px solid var(--border)', boxShadow: 'none' }}>Edit</Link>
                                            <button
                                                onClick={() => handleDelete(user.id, user.profile?.firstName || user.email)}
                                                className="btn-primary"
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'white', color: 'var(--error)', border: '1px solid var(--border)', boxShadow: 'none' }}
                                                disabled={deletingId === user.id}
                                            >
                                                {deletingId === user.id ? '...' : 'Delete'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>No users found matching your search.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Users;
