import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import { api } from '../services/api';

const Users: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const { } = useAuth(); // Token unused by api service but kept for context
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
            const data = await api.get<any[]>('/users');
            console.log("Fetched users:", data);
            if (Array.isArray(data)) {
                setUsers(data);
            } else {
                console.error("Received invalid users data:", data);
                setUsers([]);
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
                    await api.delete(`/users/${id}`);
                    setUsers(users.filter(u => u.id !== id));
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
                        const data = await api.post<any>('/users/import', { users: usersToImport });
                        alert(`Import Complete!\nSuccess: ${data.results.success}\nFailed: ${data.results.failed}\n${data.results.errors.length > 0 ? 'Errors:\n' + data.results.errors.join('\n') : ''}`);
                        fetchUsers();
                    } catch (err: any) {
                        console.error(err);
                        alert('Error importing users: ' + (err.message || 'Unknown error'));
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2">User Management</h1>
                    <p className="text-slate-500">Manage access and update employee information.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        className="hidden-input"
                        onChange={handleFileUpload}
                        title="Import CSV"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-primary bg-white text-[var(--primary)] border border-[var(--primary)] text-sm px-4 py-2"
                    >
                        📥 Import CSV
                    </button>
                    <Link to="/users/create" className="btn-primary text-decoration-none text-sm px-4 py-2">+ Add Employee</Link>
                </div>
            </div>

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    className="input-field max-w-sm bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="glass-panel p-0 overflow-hidden bg-white overflow-x-auto">

                {loading ? <div className="p-8 text-center text-slate-500">Loading...</div> : (
                    <table className="table-container min-w-[900px]">
                        <thead className="table-header">
                            <tr className="table-header-row">
                                <th className="table-header-cell">Employee Name</th>
                                <th className="table-header-cell">ID</th>
                                <th className="table-header-cell">Role</th>
                                <th className="table-header-cell">Phone</th>
                                <th className="table-header-cell">Designation</th>
                                <th className="table-header-cell-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                <tr key={user.id} className="table-row">
                                    <td className="table-cell">
                                        <div className="user-info-row">
                                            <div className="user-avatar">
                                                {user.profile?.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="user-name">{user.profile?.firstName} {user.profile?.lastName}</div>
                                                <div className="user-email">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="table-cell-mono">
                                        {user.employeeId || '-'}
                                    </td>
                                    <td className="table-cell">
                                        <span className={`role-badge ${user.role === 'ADMIN' ? 'role-badge-admin' :
                                            user.role === 'HR' ? 'role-badge-hr' :
                                                user.role === 'MANAGER' ? 'role-badge-manager' :
                                                    'role-badge-employee'
                                            }`}>{user.role}</span>
                                    </td>
                                    <td className="table-cell-text">{user.profile?.phone || '-'}</td>
                                    <td className="table-cell-text">{user.profile?.designation || '-'}</td>
                                    <td className="table-cell-right">
                                        <div className="action-buttons">
                                            <Link to={`/employees/${user.id}`} className="btn-view">View</Link>
                                            <Link to={`/users/edit/${user.id}`} className="btn-edit">Edit</Link>
                                            {user.email !== 'admin@citrux.com' && user.role !== 'SUPER_ADMIN' && (
                                                <button
                                                    onClick={() => handleDelete(user.id, user.profile?.firstName || user.email)}
                                                    className="btn-delete"
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
                                    <td colSpan={6} className="table-empty">No users found matching your search.</td>
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
