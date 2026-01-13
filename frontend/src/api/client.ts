import axios from 'axios';

// Use environment variable or fallback to /api for proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
  // Event-scoped participant and attendance management
  getParticipants: (eventId: string) => api.get(`/events/${eventId}/participants`),
  getAttendance: (eventId: string) => api.get(`/events/${eventId}/participants/attendance`),
  deleteAllParticipants: (eventId: string) => api.delete(`/events/${eventId}/participants`),
  deleteSelectedParticipants: (eventId: string, participantIds: string[]) => 
    api.post(`/events/${eventId}/participants/bulk-delete`, { participant_ids: participantIds }),
  deleteAllAttendance: (eventId: string) => api.delete(`/events/${eventId}/participants/attendance`),
  deleteSelectedAttendance: (eventId: string, attendanceIds: string[]) =>
    api.post(`/events/${eventId}/participants/attendance/bulk-delete`, { attendance_ids: attendanceIds }),
};

// Participants API
export const participantsAPI = {
  create: (data: any) => api.post('/participants', data),
  createWithEvent: (data: any) => api.post('/participants/with-event', data),
  bulkCreateWithEvent: (data: any) => api.post('/participants/bulk-import', data),
  bulkCreateWithEventBatch: (data: any) => api.post('/participants/bulk-import-batch', data),
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
  bulkImport: (data: any) => api.post('/attendance/bulk-import', data),
  bulkImportBatch: (data: any) => api.post('/attendance/bulk-import-batch', data),
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
  toggleStatus: (id: string, isActive: boolean) =>
    api.patch(`/volunteers/${id}/toggle-status`, { is_active: isActive }),
  delete: (id: string) => api.delete(`/volunteers/${id}`),
  // Volunteer attendance tracking - uses imported attendance data
  getAttendanceByEvent: (eventId: string) => 
    api.get(`/events/${eventId}/volunteer-attendance`),
  getRecentAttendance: (volunteerId: string, limit: number = 5) =>
    api.get(`/volunteers/${volunteerId}/recent-attendance`, { params: { limit } }),
  deleteAttendance: (volunteerAttendanceId: string) => 
    api.delete(`/volunteer-attendance/${volunteerAttendanceId}`),
  deleteAllAttendanceForEvent: (eventId: string) => 
    api.delete(`/events/${eventId}/volunteer-attendance`),
  bulkImportAttendance: (eventId: string, data: any) => 
    api.post(`/events/${eventId}/volunteer-attendance/import`, data),
  // Volunteer work assignments
  getWorkHistory: (volunteerId: string) =>
    api.get(`/volunteers/${volunteerId}/work-history`),
  createWorkAssignment: (data: any) => 
    api.post('/volunteers/work-assignments', data),
  deleteWorkAssignment: (workId: string) => 
    api.delete(`/volunteers/work-assignments/${workId}`),
  deleteAllWorkForEvent: (eventId: string, volunteerId: string) =>
    api.delete(`/volunteers/${volunteerId}/work-history/${eventId}`),
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
    const responseData = response.data;
    return {
      ...response,
      data: responseData && responseData.data !== undefined ? responseData.data : responseData,
    };
  },
  (error) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);
