const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
    constructor() {
        this.baseUrl = `${API_BASE}/api`;
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    async request(endpoint, options = {}) {
        let url = `${this.baseUrl}${endpoint}`;

        const config = {
            headers: {
                ...this.getHeaders(),
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            ...options,
        };

        // Append timestamp to prevent caching for GET requests
        if (!options.method || options.method === 'GET') {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}_t=${Date.now()}`;
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            let errorMessage = data.message || 'API request failed';

            // Handle validation errors from express-validator
            if (data.errors && Array.isArray(data.errors)) {
                const validationMessages = data.errors.map(err =>
                    `${err.path || err.param}: ${err.msg}`
                ).join(', ');
                errorMessage = validationMessages || errorMessage;
            }

            throw new Error(errorMessage);
        }

        return data;
    }

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body });
    }

    put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body });
    }

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

export const api = new ApiService();

// Specific API functions
export const tripApi = {
    search: (params) => {
        const query = new URLSearchParams(params).toString();
        return api.get(`/trips/search?${query}`);
    },
    getById: (id) => api.get(`/trips/${id}`),
    getSeats: (id) => api.get(`/trips/${id}/seats`),
    getFeatured: () => api.get('/trips/featured/list'),
};

export const bookingApi = {
    create: (data) => api.post('/bookings', data),
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return api.get(`/bookings?${query}`);
    },
    getById: (id) => api.get(`/bookings/${id}`),
    cancel: (id, reason) => api.post(`/bookings/${id}/cancel`, { reason }),
};

export const adminApi = {
    getDashboard: () => api.get('/admin/dashboard'),
    getRevenue: (params) => {
        const query = new URLSearchParams(params).toString();
        return api.get(`/admin/analytics/revenue?${query}`);
    },
    getTrends: () => api.get('/admin/analytics/trends'),
    forceUnlock: (tripId, seatNumber) => api.post('/admin/force-unlock', { tripId, seatNumber }),
    getLocks: (tripId) => api.get(`/admin/locks/${tripId}`),
    clearLocks: (tripId) => api.delete(`/admin/locks/${tripId}`),
    getUsers: (params) => {
        const query = new URLSearchParams(params).toString();
        return api.get(`/admin/users?${query}`);
    },
    getOperators: () => api.get('/admin/operators'),
    getSchedules: (params) => {
        const query = new URLSearchParams(params).toString();
        return api.get(`/admin/schedules?${query}`);
    },
    getSales: (params) => {
        const query = new URLSearchParams(params).toString();
        return api.get(`/admin/sales?${query}`);
    },
    getBooking: (id) => api.get(`/admin/bookings/${id}`),
    getMetrics: () => api.get('/admin/metrics'),
};
