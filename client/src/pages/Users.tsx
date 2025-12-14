import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

const Users: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Modal State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Fetched users:", data);
                if (Array.isArray(data)) {
                    setUsers(data);
                } else {
                    console.error("Received invalid users data:", data);
                    setUsers([]);
                }
            } else {
                console.error("Failed to fetch users:", response.status);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string, name: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Delete Employee',
            message: `Are you sure you want to delete ${name}? This action cannot be undone.`,
            type: 'danger',
            onConfirm: async () => {
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
            }
        });
    };

    const filteredUsers = Array.isArray(users) ? users.filter(user =>
        (user.email && user.email.toLowerCase().includes(search.toLowerCase())) ||
        (user.profile?.firstName && user.profile.firstName.toLowerCase().includes(search.toLowerCase())) ||
        (user.profile?.lastName && user.profile.lastName.toLowerCase().includes(search.toLowerCase()))
    ) : [];

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            // Simple CSV Parser
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '')); // Remove quotes

            const usersToImport: any[] = [];

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;

                const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const userObj: any = {};

                headers.forEach((header, index) => {
                    // map common CSV headers to our schema keys
                    let key = header.toLowerCase();
                    if (key === 'firstname' || key === 'first name') key = 'firstName';
                    else if (key === 'lastname' || key === 'last name') key = 'lastName';
                    else if (key === 'joiningdate' || key === 'date of joining') key = 'joiningDate';
                    else if (key === 'employeeid' || key === 'empid' || key === 'id') key = 'employeeId';

                    if (values[index]) {
                        userObj[key] = values[index];
                    }
                });

                if (userObj.email && userObj.firstName) {
                    usersToImport.push(userObj);
                }
            }

            if (usersToImport.length === 0) {
                alert('No valid users found in CSV. Please ensure headers include "email" and "firstName".');
                return;
            }

            setConfirmState({
                isOpen: true,
                title: 'Import Users',
                message: `Found ${usersToImport.length} users in the CSV file. Do you want to proceed with the import?`,
                type: 'info',
                onConfirm: async () => {
                    setLoading(true);
                    try {
                        const response = await fetch('http://localhost:5000/api/users/import', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({ users: usersToImport })
                        });

                        const data = await response.json();
                        if (response.ok) {
                            alert(`Import Complete!\nSuccess: ${data.results.success}\nFailed: ${data.results.failed}\n${data.results.errors.length > 0 ? 'Errors:\n' + data.results.errors.join('\n') : ''}`);
                            fetchUsers();
                        } else {
                            alert('Import Failed: ' + data.message);
                        }
                    } catch (err) {
                        console.error(err);
                        alert('Error importing users');
                    } finally {
                        setLoading(false);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                }
            });
        };
        reader.readAsText(file);
    };

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>User Management</h1>
                    <p>Manage access and update employee information.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-primary"
                        style={{ background: 'white', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
                        📥 Import CSV
                    </button>
                    <Link to="/users/create" className="btn-primary" style={{ textDecoration: 'none' }}>+ Add Employee</Link>
                </div>
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
                                <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>ID</th>
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
                                    <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#374151', fontFamily: 'monospace' }}>
                                        {user.employeeId || '-'}
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
                                            <Link to={`/employees/${user.id}`} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'white', color: 'var(--primary)', border: '1px solid var(--border)', boxShadow: 'none' }}>View</Link>
                                            <Link to={`/users/edit/${user.id}`} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'white', color: 'var(--primary)', border: '1px solid var(--border)', boxShadow: 'none' }}>Edit</Link>
                                            {user.email !== 'admin@citrux.com' && user.role !== 'SUPER_ADMIN' && (
                                                <button
                                                    onClick={() => handleDelete(user.id, user.profile?.firstName || user.email)}
                                                    className="btn-primary"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'white', color: 'var(--error)', border: '1px solid var(--border)', boxShadow: 'none' }}
                                                    disabled={deletingId === user.id}
                                                >
                                                    {deletingId === user.id ? '...' : 'Delete'}
                                                </button>
                                            )}
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

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                type={confirmState.type}
            />
        </div>
    );
};

export default Users;
