import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { Button } from '../components/ui/Button';

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
            {/* Search and Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                <div className="relative w-full md:w-96">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Icon name="search" size={18} />
                    </span>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="input-field pl-12"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        title="Search Employees"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                        title="Upload Employee CSV"
                    />
                    <Button
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6"
                    >
                        <Icon name="download" size={18} className="rotate-180" /> Import
                    </Button>
                    <Link to="/users/create">
                        <Button className="px-6">
                            <Icon name="plus" size={18} /> Add Employee
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="table-container-premium">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-500 font-bold">Loading Employees...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Employee Name</th>
                                    <th>ID</th>
                                    <th>Role</th>
                                    <th>Phone</th>
                                    <th>Designation</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-[var(--bg-body)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[var(--primary)] shadow-sm">
                                                    {user.profile?.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{user.profile?.firstName} {user.profile?.lastName}</div>
                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="font-mono text-sm text-slate-500">
                                            {user.employeeId || '-'}
                                        </td>
                                        <td>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                                                user.role === 'HR' ? 'bg-blue-100 text-blue-700' :
                                                    user.role === 'MANAGER' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-slate-100 text-slate-600'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="text-sm text-slate-600">{user.profile?.phone || '-'}</td>
                                        <td className="text-sm text-slate-600">{user.profile?.designation || '-'}</td>
                                        <td>
                                            <div className="flex justify-end gap-2">
                                                <Link to={`/employees/${user.id}`} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors" title="View Profile">
                                                    <Icon name="eye" size={18} />
                                                </Link>
                                                <Link to={`/users/edit/${user.id}`} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors" title="Edit User">
                                                    <Icon name="edit" size={18} />
                                                </Link>
                                                {user.email !== 'admin@citrux-hrms.com' && user.role !== 'SUPER_ADMIN' && (
                                                    <button
                                                        onClick={() => handleDelete(user.id, user.profile?.firstName || user.email)}
                                                        className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                                                        disabled={deletingId === user.id}
                                                        title="Delete User"
                                                    >
                                                        {deletingId === user.id ? '...' : <Icon name="delete" size={18} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-400">
                                            No users found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
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
