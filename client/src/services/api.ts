const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-6sfe.onrender.com/api');

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

class ApiService {
    private activeRequests = 0;

    private setLoading(isLoading: boolean) {
        if (isLoading) {
            this.activeRequests++;
            if (this.activeRequests === 1) {
                window.dispatchEvent(new CustomEvent('app:loading', { detail: { loading: true } }));
            }
        } else {
            this.activeRequests--;
            if (this.activeRequests <= 0) {
                this.activeRequests = 0;
                window.dispatchEvent(new CustomEvent('app:loading', { detail: { loading: false } }));
            }
        }
    }

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
        const url = `${API_URL}${endpoint}`;
        const defaultHeaders = this.getHeaders();

        // If body is FormData, remove Content-Type to let browser set boundary
        if (options.body instanceof FormData) {
            delete defaultHeaders['Content-Type'];
        }

        const headers = { ...defaultHeaders, ...options.headers };

        this.setLoading(true);

        try {
            const response = await fetch(url, { ...options, headers });

            // Handle 401 Unauthorized globally
            if (response.status === 401) {
                window.dispatchEvent(new Event('auth:logout'));
            }

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const message = data.message || 'An unexpected server error occurred.';
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type: 'error' } }));
                throw new Error(message);
            }

            return data;
        } catch (error: any) {
            console.error(`API Error [${endpoint}]:`, error);
            // If it's a network error (no response)
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Network error. Please check your connection.', type: 'error' } }));
            }
            throw error;
        } finally {
            this.setLoading(false);
        }
    }

    public get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET', headers });
    }

    public post<T>(endpoint: string, body: any, headers?: Record<string, string>): Promise<T> {
        const isFormData = body instanceof FormData;

        // Let the browser set Content-Type for FormData (multipart/form-data boundary)
        if (isFormData) {
            // We return a custom object that the request method handles, 
            // OR we modify how request handles default headers.
            // Simplest is to pass a flag or handling it here if we could access request.
        }

        return this.request<T>(endpoint, {
            method: 'POST',
            body: isFormData ? body : JSON.stringify(body),
            headers: isFormData ? { ...headers } : headers // If FormData, don't fallback to default json yet, wait.
        });
    }

    public put<T>(endpoint: string, body: any, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
            headers
        });
    }

    public delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE', headers });
    }
}

export const api = new ApiService();
