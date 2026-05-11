const API_URL = import.meta.env.VITE_API_URL || 'https://citrux-hrms-api.onrender.com/api';
// Extract base URL (remove /api)
const BASE_URL = API_URL.replace(/\/api\/?$/, '');

/**
 * Resolves an image path/URL to a full absolute URL.
 * Handles:
 * 1. Absolute URLs (Cloudinary, etc.) -> returns as is
 * 2. Relative paths (uploads/...) -> prepends backend BASE_URL
 * 3. Empty/null values -> returns placeholder or null
 */
export const resolveImageUrl = (path: string | null | undefined): string => {
    if (!path) return '';
    
    // If it's already an absolute URL, return it
    if (path.startsWith('http')) {
        return path;
    }
    
    // If it's a data URL, return it
    if (path.startsWith('data:')) {
        return path;
    }
    
    // Ensure relative paths don't have leading slash if BASE_URL doesn't end with one
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const resolvedUrl = `${BASE_URL}/${cleanPath}`;
    
    // If it's a local upload, append the auth token
    if (cleanPath.startsWith('uploads/')) {
        const token = localStorage.getItem('token');
        if (token) {
            return `${resolvedUrl}?token=${token}`;
        }
    }
    
    return resolvedUrl;
};
