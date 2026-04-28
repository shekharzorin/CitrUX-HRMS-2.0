const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://citrux-hrms-api.onrender.com/api');

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
    /** When true, suppresses the global error toast so the caller can show its own UI. */
    silent?: boolean;
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
                if (!options.silent) {
                    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type: 'error' } }));
                }
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

    public get<T>(endpoint: string, options?: { headers?: Record<string, string>; silent?: boolean }): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET', headers: options?.headers, silent: options?.silent });
    }

    public post<T>(endpoint: string, body: any, options?: Record<string, string> | { headers?: Record<string, string>; silent?: boolean }): Promise<T> {
        const isFormData = body instanceof FormData;
        // Support legacy callers passing headers directly as a plain Record<string,string>
        const isLegacy = options && !('headers' in options) && !('silent' in options);
        const headers  = isLegacy ? (options as Record<string, string>) : (options as any)?.headers;
        const silent   = isLegacy ? false : (options as any)?.silent ?? false;

        return this.request<T>(endpoint, {
            method: 'POST',
            body: isFormData ? body : JSON.stringify(body),
            headers,
            silent,
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
