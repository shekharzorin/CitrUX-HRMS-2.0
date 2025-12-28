const API_URL = import.meta.env.VITE_API_URL || 'https://hrms-6sfe.onrender.com/api';

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

class ApiService {
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
        const headers = { ...this.getHeaders(), ...options.headers };

        try {
            const response = await fetch(url, { ...options, headers });

            // Handle 401 Unauthorized globally if needed (e.g., dispatch logout event)
            if (response.status === 401) {
                // Optional: window.dispatchEvent(new Event('auth:logout'));
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    public get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET', headers });
    }

    public post<T>(endpoint: string, body: any, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
            headers
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
