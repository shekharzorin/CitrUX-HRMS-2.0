import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/ui/Icons';
import { useToast } from '../contexts/ToastContext';

interface Document {
    id: string;
    name: string;
    category: string;
    url: string;
    fileSize: number;
    fileType: string;
    uploadedAt: string;
    expiryDate: string | null;
    status: string;
    version: number;
    notes: string | null;
    tags: string | null;
    uploader?: { profile?: { firstName: string, lastName: string } };
    userId: string;
    user?: { employeeId?: string, profile?: { firstName: string, lastName: string } };
}

const CATEGORIES = ['EDUCATIONAL', 'IDENTITY', 'CERTIFICATION', 'OFFER_LETTER', 'HIKE_LETTER', 'INTERNAL', 'OTHER'];

const Documents: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const isPrivileged = ['ADMIN', 'HR'].includes(user?.role || '');
    
    const [activeTab, setActiveTab] = useState<'MY' | 'COMPANY'>('MY');
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Upload Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadData, setUploadData] = useState({
        name: '',
        category: 'IDENTITY',
        expiryDate: '',
        notes: '',
        tags: '',
        targetUserId: user?.id || '',
        parentDocId: ''
    });
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, [activeTab]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'COMPANY' && isPrivileged 
                ? '/documents/company/all' 
                : '/documents/my';
            const res = await api.get<Document[]>(endpoint);
            setDocuments(res || []);
        } catch (error) {
            console.error('Failed to fetch documents', error);
            showToast('Failed to load documents', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadFile(e.target.files[0]);
            if (!uploadData.name) {
                setUploadData(prev => ({ ...prev, name: e.target.files![0].name.split('.')[0] }));
            }
        }
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) return alert('Please select a file');

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('name', uploadData.name);
        formData.append('category', uploadData.category);
        if (uploadData.expiryDate) formData.append('expiryDate', uploadData.expiryDate);
        if (uploadData.notes) formData.append('notes', uploadData.notes);
        if (uploadData.tags) formData.append('tags', uploadData.tags);
        if (uploadData.parentDocId) formData.append('parentDocId', uploadData.parentDocId);
        if (isPrivileged && uploadData.targetUserId) {
            formData.append('targetUserId', uploadData.targetUserId);
        }

        try {
            await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showToast('Document uploaded successfully', 'success');
            setIsUploadModalOpen(false);
            setUploadFile(null);
            setUploadData({ name: '', category: 'IDENTITY', expiryDate: '', notes: '', tags: '', targetUserId: user?.id || '', parentDocId: '' });
            fetchDocuments();
        } catch (error) {
            console.error(error);
            showToast('Failed to upload document', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const viewDocument = async (doc: Document) => {
        try {
            const filename = doc.url.split('/').pop();
            const res = await api.get<{url: string}>(`/documents/generate-url/${filename}`);
            window.open(res.url, '_blank');
        } catch (error) {
            showToast('Error opening document', 'error');
        }
    };

    const deleteDocument = async (id: string) => {
        if (!confirm('Are you sure you want to archive this document?')) return;
        try {
            await api.delete(`/documents/${id}`);
            showToast('Document archived', 'success');
            fetchDocuments();
        } catch (error) {
            showToast('Failed to delete document', 'error');
        }
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return 'Unknown size';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    };

    return (
        <div className="page-container">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="page-title text-2xl font-bold text-slate-800 dark:text-white">Document Management</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage KYC, educational, and internal documents.</p>
                </div>
                <button onClick={() => setIsUploadModalOpen(true)} className="btn-primary flex items-center gap-2">
                    <Icon name="upload" size={16} /> Upload Document
                </button>
            </div>

            {isPrivileged && (
                <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                    <button 
                        className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'MY' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        onClick={() => setActiveTab('MY')}
                    >
                        My Documents
                    </button>
                    <button 
                        className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'COMPANY' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        onClick={() => setActiveTab('COMPANY')}
                    >
                        Company Documents
                    </button>
                </div>
            )}

            <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="p-4 font-semibold">Document</th>
                                {activeTab === 'COMPANY' && <th className="p-4 font-semibold">Employee</th>}
                                <th className="p-4 font-semibold">Category</th>
                                <th className="p-4 font-semibold">Uploaded</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-slate-900">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading documents...</td></tr>
                            ) : documents.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No documents found.</td></tr>
                            ) : documents.map(doc => (
                                <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                                <Icon name="file_text" size={20} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-white">{doc.name}</p>
                                                <p className="text-xs text-slate-400">{formatSize(doc.fileSize)} • v{doc.version}</p>
                                            </div>
                                        </div>
                                    </td>
                                    {activeTab === 'COMPANY' && (
                                        <td className="p-4">
                                            {doc.user?.profile ? `${doc.user.profile.firstName} ${doc.user.profile.lastName}` : 'Unknown'}
                                            <div className="text-xs text-slate-400">{doc.user?.employeeId || doc.userId}</div>
                                        </td>
                                    )}
                                    <td className="p-4">
                                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-xs font-medium">
                                            {doc.category.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <p>{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                        <p className="text-xs text-slate-400">by {doc.uploader?.profile ? doc.uploader.profile.firstName : 'System'}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                            doc.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            doc.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => viewDocument(doc)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="View">
                                                <Icon name="eye" size={16} />
                                            </button>
                                            <button onClick={() => {
                                                setUploadData(prev => ({ ...prev, name: doc.name, category: doc.category, parentDocId: doc.id, targetUserId: doc.user?.employeeId || doc.userId }));
                                                setIsUploadModalOpen(true);
                                            }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Upload New Version">
                                                <Icon name="upload" size={16} />
                                            </button>
                                            <button onClick={() => deleteDocument(doc.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Archive">
                                                <Icon name="delete" size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                {uploadData.parentDocId ? 'Upload New Version' : 'Upload Document'}
                            </h2>
                            <button onClick={() => setIsUploadModalOpen(false)} title="Close Modal" aria-label="Close Modal" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
                            <div>
                                <label htmlFor="docFile" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">File *</label>
                                <input id="docFile" type="file" title="Select File" aria-label="Select File" onChange={handleFileChange} required className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-400" />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Document Name *</label>
                                <input type="text" className="input-field" value={uploadData.name} onChange={e => setUploadData({...uploadData, name: e.target.value})} required placeholder="e.g. 10th Marksheet" />
                            </div>

                            <div>
                                <label htmlFor="docCategory" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                                <select id="docCategory" title="Select Category" aria-label="Select Category" className="input-field" value={uploadData.category} onChange={e => setUploadData({...uploadData, category: e.target.value})} required>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                                </select>
                            </div>

                            {activeTab === 'COMPANY' && isPrivileged && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target User ID (Optional)</label>
                                    <input type="text" className="input-field" value={uploadData.targetUserId} onChange={e => setUploadData({...uploadData, targetUserId: e.target.value})} placeholder="Leave blank for self" />
                                </div>
                            )}

                            <div>
                                <label htmlFor="docExpiry" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expiry Date (Optional)</label>
                                <input id="docExpiry" type="date" title="Expiry Date" aria-label="Expiry Date" className="input-field" value={uploadData.expiryDate} onChange={e => setUploadData({...uploadData, expiryDate: e.target.value})} />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tags (Optional)</label>
                                <input type="text" className="input-field" value={uploadData.tags} onChange={e => setUploadData({...uploadData, tags: e.target.value})} placeholder="e.g. kyc, verified, confidential" />
                            </div>

                            <div className="pt-4 flex gap-3 justify-end">
                                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isUploading || !uploadFile} className="btn-primary">
                                    {isUploading ? 'Uploading...' : 'Upload'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Documents;
