import axios from 'axios';

const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Events API
export const eventsAPI = {
  create: (data: any) => api.post('/events', data),
  getAll: () => api.get('/events'),
  getById: (id: string) => api.get(`/events/${id}`),
  update: (id: string, data: any) => api.put(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
};

// Participants API
export const participantsAPI = {
  create: (data: any) => api.post('/participants', data),
  getAll: (includeBlocklisted: boolean = false) =>
    api.get('/participants', { params: { includeBlocklisted } }),
  getById: (id: string) => api.get(`/participants/${id}`),
  update: (id: string, data: any) => api.put(`/participants/${id}`, data),
  getActiveCount: () => api.get('/participants/stats/active'),
  getBlocklistedCount: () => api.get('/participants/stats/blocklisted'),
};

// Attendance API
export const attendanceAPI = {
  mark: (data: any) => api.post('/attendance', data),
  getByEvent: (eventId: string) => api.get(`/attendance/event/${eventId}`),
  getByParticipant: (participantId: string) => api.get(`/attendance/participant/${participantId}`),
  update: (id: string, status: string) => api.put(`/attendance/${id}`, { status }),
  getStats: () => api.get('/attendance/stats/overview'),
};

// Blocklist API
export const blocklistAPI = {
  add: (data: any) => api.post('/blocklist', data),
  getAll: () => api.get('/blocklist'),
  remove: (participantId: string) => api.delete(`/blocklist/${participantId}`),
};

// Volunteers API
export const volunteersAPI = {
  create: (data: any) => api.post('/volunteers', data),
  getAll: (sort: 'newest' | 'oldest' = 'newest') =>
    api.get('/volunteers', { params: { sort } }),
  getById: (id: string) => api.get(`/volunteers/${id}`),
  update: (id: string, data: any) => api.put(`/volunteers/${id}`, data),
  delete: (id: string) => api.delete(`/volunteers/${id}`),
};

// Settings API
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data: any) => api.put('/settings', data),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Error handler
api.interceptors.response.use(
  (response) => {
    // response.data contains the ApiResponse { success, data, timestamp }
    // Return the data field for easier access in components
    return {
      ...response,
      data: response.data.data,
    };
  },
  (error) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);
