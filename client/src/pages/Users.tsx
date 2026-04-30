import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { api } from '../services/api';
import { Icon } from '../components/ui/Icons';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Avatar } from '../components/ui/Avatar';
import { useToast } from '../contexts/ToastContext';
import { canManageUser } from '../utils/permissions';
import { resolveImageUrl } from '../utils/image';

const UserCard = ({ user, currentUser, onDelete }: { user: any, currentUser: any, onDelete: (id: string, name: string) => void }) => {
    return (
        <div className="card-premium p-6 flex flex-col items-center text-center relative group hover:-translate-y-1 transition-transform duration-300 border border-[var(--border-light)] dark:border-slate-800 bg-[var(--bg-surface)]">
            {/* Top Pattern */}
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-slate-50 to-transparent dark:from-white/5 rounded-t-3xl -z-10 opacity-60 dark:opacity-30"></div>

            <div className="relative mb-4">
                <Avatar
                    name={user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName}` : user.email}
                    src={resolveImageUrl(user.profile?.profilePhoto)}
                    size="80px"
                    className="border-4 border-white dark:border-slate-800 shadow-md bg-[var(--bg-surface)]"
                />
                <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center ${user.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                    <Icon name={user.isActive !== false ? "check_circle" : "minus"} size={12} className="text-white" />
                </div>
            </div>

            <div className="mb-1">
                <h3 className="font-bold text-lg text-[var(--text-main)] truncate max-w-[200px] mx-auto">
                    {user.profile?.firstName} {user.profile?.lastName}
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">{user.profile?.designation || 'Team Member'}</p>
                {currentUser?.role === 'SUPER_ADMIN' && user.company?.name && (
                    <div className="mt-1.5 flex justify-center">
                        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full truncate max-w-[180px]">
                            {user.company.name}
                        </span>
                    </div>
                )}
            </div>

            <span className={`mt-2 mb-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                user.role === 'HR' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    user.role === 'MANAGER' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                {user.role}
            </span>

            <div className="w-full border-t border-[var(--border-light)] my-4"></div>

            <div className="flex items-center justify-center gap-3 w-full">
                <Link to={`/employees/${user.id}`} className="flex-1">
                    <Button variant="outline" size="sm" fullWidth className="text-xs">Profile</Button>
                </Link>

                {['ADMIN', 'HR', 'SUPER_ADMIN'].includes(currentUser?.role?.toUpperCase() || '') && canManageUser(currentUser?.role, user.role) && (
                    <div className="flex gap-2">
                        <Link to={`/users/edit/${user.id}`} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors" title="Edit User" aria-label="Edit User">
                            <Icon name="edit" size={16} />
                        </Link>
                        {user.email !== 'admin@citrux-hrms.com' && user.role !== 'SUPER_ADMIN' && user.id !== currentUser?.id && (
                            <button
                                onClick={() => onDelete(user.id, user.profile?.firstName || user.email)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                                title="Delete User"
                                aria-label="Delete User"
                            >
                                <Icon name="delete" size={16} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const Users: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const { user: useUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [search, setSearch] = useState('');
    const { showToast } = useToast();

    // Import Ref
    const fileInputRef = React.useRef<HTMLInputElement>(null);

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
        setError(false);
        try {
            const data = await api.get<any[]>('/users');
            if (Array.isArray(data)) {
                setUsers(data);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error(error);
            setError(true);
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
                // Future: Use a loading state if needed
                try {
                    await api.delete(`/users/${id}`);
                    setUsers(users.filter(u => u.id !== id));
                    showToast(`Successfully deleted ${name}`, 'success');
                } catch (error) {
                    showToast('Failed to delete user', 'error');
                }
            }
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (!text) return;
            // ... (Keep existing CSV logic if needed, simplified here for brevity but logic remains same)
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const usersToImport: any[] = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const userObj: any = {};
                headers.forEach((header, index) => {
                    let key = header.toLowerCase();
                    if (key === 'firstname' || key === 'first name') key = 'firstName';
                    else if (key === 'lastname' || key === 'last name') key = 'lastName';
                    else if (key === 'joiningdate' || key === 'date of joining') key = 'joiningDate';
                    else if (key === 'employeeid' || key === 'empid' || key === 'id') key = 'employeeId';
                    if (values[index]) userObj[key] = values[index];
                });
                if (userObj.email && userObj.firstName) usersToImport.push(userObj);
            }

            if (usersToImport.length === 0) {
                showToast('No valid users found in CSV.', 'warning');
                return;
            }

            setConfirmState({
                isOpen: true, title: 'Import Users', message: `Import ${usersToImport.length} users?`, type: 'info',
                onConfirm: async () => {
                    setLoading(true);
                    try {
                        const data = await api.post<any>('/users/import', { users: usersToImport });
                        showToast(`Imported: ${data.results.success} Success, ${data.results.failed} Failed`, 'success');
                        fetchUsers();
                    } catch (err: any) {
                        showToast('Error importing users', 'error');
                    } finally { setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
                }
            });
        };
        reader.readAsText(file);
    };

    const filteredUsers = Array.isArray(users) ? users.filter(user =>
        (user.email && user.email.toLowerCase().includes(search.toLowerCase())) ||
        (user.profile?.firstName && user.profile.firstName.toLowerCase().includes(search.toLowerCase())) ||
        (user.profile?.lastName && user.profile.lastName.toLowerCase().includes(search.toLowerCase())) ||
        (user.company?.name && user.company.name.toLowerCase().includes(search.toLowerCase()))
    ) : [];

    if (error) {
        return (
            <div className="page-container flex items-center justify-center min-h-[60vh]">
                <EmptyState title="Unable to Load Users" description="Connection error." icon="warning" action={<Button onClick={fetchUsers}>Retry</Button>} />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Employees</h1>
                    <p className="text-[var(--text-muted)] mt-1">Manage your team members and permissions.</p>
                </div>

                <div className="flex items-center gap-3">
                    {['ADMIN', 'HR', 'SUPER_ADMIN'].includes(useUser?.role?.toUpperCase() || '') && (
                        <>
                            <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} title="Import CSV" />
                            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                                <Icon name="upload" size={18} /> Import CSV
                            </Button>
                            <Link to="/users/create">
                                <Button className="shadow-lg shadow-lime-500/20">
                                    <Icon name="plus" size={18} /> Add Employee
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* Search Filter */}
            <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2 max-w-xl">
                <div className="p-3 text-slate-400">
                    <Icon name="search" size={20} />
                </div>
                <input
                    type="text"
                    placeholder="Search employees by name, email, or role..."
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium h-full"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                    <button onClick={() => setSearch('')} className="p-2 text-slate-400 hover:text-slate-600" aria-label="Clear Search">
                        <Icon name="close" size={16} />
                    </button>
                )}
            </div>

            {/* Grid Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="card-premium p-6 flex flex-col items-center">
                            <Skeleton variant="circular" width={80} height={80} className="mb-4" />
                            <Skeleton width={120} height={20} className="mb-2" />
                            <Skeleton width={80} height={16} className="mb-4" />
                            <Skeleton width="100%" height={32} className="mt-auto" />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {filteredUsers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredUsers.map(user => (
                                <UserCard
                                    key={user.id}
                                    user={user}
                                    currentUser={useUser}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            title="No Employees Found"
                            description={search ? `No results found for "${search}"` : "Get started by adding your first employee."}
                            icon="search"
                            className="py-12"
                        />
                    )}
                </>
            )}

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
