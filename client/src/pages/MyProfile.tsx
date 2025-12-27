import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaCloudUploadAlt, FaPlus, FaTrash, FaCheck } from 'react-icons/fa';
import { Button } from '../components/ui/Button';
import Cropper from 'react-easy-crop';
import { api } from '../services/api';

const MyProfile: React.FC = () => {
    const { user, updateUser } = useAuth(); // Token unused by api service but kept for context
    const [profile, setProfile] = useState<any>(null);
    const [form, setForm] = useState({
        phone: '',
        address: '',
        emergencyContact: '',
        profilePhoto: '',
        profilePhotoSettings: { zoom: 1, crop: { x: 0, y: 0 }, croppedAreaPixels: null as any },
        firstName: '',
        lastName: '',
        designation: '',
        department: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [showPhotoAdjust, setShowPhotoAdjust] = useState(false);
    const [loading, setLoading] = useState(false);

    // Cropper state
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const data = await api.get<any>('/profile');
            if (data) {
                setProfile(data);
                if (data.profile) {
                    let settings = { zoom: 1, crop: { x: 0, y: 0 }, croppedAreaPixels: null as any };
                    if (data.profile.profilePhotoSettings) {
                        try {
                            settings = typeof data.profile.profilePhotoSettings === 'string'
                                ? JSON.parse(data.profile.profilePhotoSettings)
                                : data.profile.profilePhotoSettings;
                        } catch (e) { console.error("Failed to parse settings", e); }
                    }

                    setForm({
                        phone: data.profile.phone || '',
                        address: data.profile.address || '',
                        emergencyContact: data.profile.emergencyContact || '',
                        profilePhoto: data.profile.profilePhoto || '',
                        profilePhotoSettings: settings,
                        firstName: data.profile.firstName || '',
                        lastName: data.profile.lastName || '',
                        designation: data.profile.designation || '',
                        department: data.profile.department || ''
                    });
                }
            }
        } catch (error) { console.error(error); }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            setLoading(true);
            const data = await api.post<{ url: string }>('/onboarding/upload', uploadData);
            if (data && data.url) {
                setForm(prev => ({
                    ...prev,
                    profilePhoto: data.url,
                    profilePhotoSettings: { zoom: 1, crop: { x: 0, y: 0 }, croppedAreaPixels: null }
                }));
                setShowPhotoAdjust(true);
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const updatedProfile = await api.put<any>('/profile', form);
            if (updatedProfile) {
                if (updateUser && user) {
                    updateUser({ ...user, profile: updatedProfile });
                }
                alert('Profile Updated');
                setIsEditing(false);
                fetchProfile();
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    if (!profile) return <div className="p-6">Loading...</div>;

    const getInitials = () => {
        const first = profile.profile?.firstName?.charAt(0) || '';
        const last = profile.profile?.lastName?.charAt(0) || '';
        return (first + last).toUpperCase() || profile.email?.charAt(0).toUpperCase();
    };

    return (
        <div className="p-6 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">My Profile</h1>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                    {/* Profile Photo Section */}
                    <div className="profile-photo-container relative shrink-0">
                        <div className="profile-avatar-wrapper w-full h-full rounded-full overflow-hidden border-8 border-white shadow-2xl bg-white flex items-center justify-center relative z-10">
                            {form.profilePhoto ? (
                                <img
                                    src={form.profilePhoto}
                                    alt="Profile"
                                    className={`w-full h-full profile-photo-img ${form.profilePhotoSettings?.croppedAreaPixels ? 'profile-photo-cropped' : 'profile-photo-full'}`}
                                    style={{
                                        '--scale': form.profilePhotoSettings?.croppedAreaPixels ? (100 / form.profilePhotoSettings.croppedAreaPixels.width) : 1,
                                        '--x': form.profilePhotoSettings?.croppedAreaPixels ? (-form.profilePhotoSettings.croppedAreaPixels.x + 'px') : ((form.profilePhotoSettings?.crop?.x || 0) + '%'),
                                        '--y': form.profilePhotoSettings?.croppedAreaPixels ? (-form.profilePhotoSettings.croppedAreaPixels.y + 'px') : ((form.profilePhotoSettings?.crop?.y || 0) + '%'),
                                        '--zoom': form.profilePhotoSettings?.zoom || 1
                                    } as React.CSSProperties}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-200 bg-slate-50 font-bold text-7xl select-none">
                                    {getInitials()}
                                </div>
                            )}
                        </div>
                        {isEditing && (
                            <div className="absolute bottom-4 right-4 flex flex-col gap-3 z-[60]">
                                <label className="profile-upload-btn w-14 h-14 items-center justify-center rounded-full cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all hover:scale-110 active:scale-95 border-4 border-white text-white">
                                    <FaCloudUploadAlt size={24} />
                                    <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" aria-label="Upload profile photo" />
                                </label>
                                {form.profilePhoto && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (form.profilePhotoSettings?.crop) {
                                                setCrop(form.profilePhotoSettings.crop);
                                                setZoom(form.profilePhotoSettings.zoom || 1);
                                            } else {
                                                setCrop({ x: 0, y: 0 });
                                                setZoom(1);
                                            }
                                            setShowPhotoAdjust(true);
                                        }}
                                        className="bg-white text-slate-700 w-12 h-12 flex items-center justify-center rounded-full border-4 border-white shadow-xl transition-all hover:scale-110 active:scale-95"
                                        title="Adjust View"
                                    >
                                        <FaPlus size={18} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="text-center md:text-left">
                        <h2 className="text-3xl font-bold text-slate-800">{profile.profile?.firstName} {profile.profile?.lastName}</h2>
                        <div className="text-lg text-slate-500 font-medium mb-2">{profile.profile?.designation} • {profile.profile?.department}</div>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-100 uppercase tracking-tighter">{profile.role}</span>
                            <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100 uppercase tracking-tighter">Active Employee</span>
                        </div>
                        <div className="text-sm text-slate-400 mt-4">Employee ID: <span className="font-mono font-bold text-slate-600">{profile.employeeId || 'NOT ASSIGNED'}</span></div>
                        <div className="text-sm text-slate-400">Joined: {new Date(profile.profile?.joiningDate || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-bold text-slate-800">General Information</h3>
                    <button
                        onClick={() => {
                            if (isEditing) fetchProfile(); // Reset on cancel
                            setIsEditing(!isEditing);
                        }}
                        className={`font-bold transition-colors ${isEditing ? 'text-red-500 hover:text-red-600' : 'text-purple-600 hover:text-purple-700'}`}
                    >
                        {isEditing ? 'Cancel Editing' : 'Edit Details'}
                    </button>
                </div>

                {isEditing ? (
                    <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Phone Number</label>
                            <input type="text" className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 00000 00000" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Emergency Contact</label>
                            <input type="text" className="input-field" value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Relationship - Phone" />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Address</label>
                            <textarea className="input-field" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={3} placeholder="Full residential address..." />
                        </div>
                        <div className="md:col-span-2 pt-4">
                            <Button type="submit" className="w-full justify-center py-3 text-base shadow-lg shadow-purple-200" disabled={loading}>
                                {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Official Email</div>
                            <div className="font-bold text-slate-700">{profile.email}</div>
                        </div>
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Mobile Phone</div>
                            <div className="font-bold text-slate-700">{profile.profile?.phone || 'Not provided'}</div>
                        </div>
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Emergency Contact</div>
                            <div className="font-bold text-slate-700">{profile.profile?.emergencyContact || 'Not set'}</div>
                        </div>
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 md:col-span-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Residential Address</div>
                            <div className="font-bold text-slate-700">{profile.profile?.address || 'Address information not provided'}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Photo Adjustment Modal */}
            {showPhotoAdjust && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up">
                        <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Adjust Profile Photo</h3>
                                <p className="text-xs text-slate-500 font-medium">Drag to move, use slider to zoom</p>
                            </div>
                            <button
                                onClick={() => setShowPhotoAdjust(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                                aria-label="Delete"
                            >
                                <FaTrash size={18} />
                            </button>
                        </div>

                        <div className="relative h-[400px] bg-slate-900">
                            <Cropper
                                image={form.profilePhoto}
                                crop={crop}
                                zoom={zoom}
                                aspect={1} // Square for circular avatar
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                                cropShape="round"
                                showGrid={true}
                            />
                        </div>

                        <div className="p-8 space-y-8 bg-white">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400" htmlFor="zoom-slider">Zoom Level</label>
                                    <span className="text-sm font-mono font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">{Math.round(zoom * 100)}%</span>
                                </div>
                                <input
                                    id="zoom-slider"
                                    type="range"
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    value={zoom}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                    aria-label="Zoom Level"
                                />
                            </div>

                            <div className="flex gap-4 pt-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowPhotoAdjust(false)}
                                    className="flex-1 justify-center py-4 border-2"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => {
                                        setForm(prev => ({
                                            ...prev,
                                            profilePhotoSettings: {
                                                crop,
                                                zoom,
                                                croppedAreaPixels
                                            }
                                        }));
                                        setShowPhotoAdjust(false);
                                    }}
                                    className="flex-1 justify-center py-4 text-lg shadow-xl shadow-purple-200"
                                >
                                    <FaCheck className="mr-2" /> Save Adjustment
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyProfile;
