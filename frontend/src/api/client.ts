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
  undoDelete: (eventId: string, type: 'participant' | 'attendance', undoToken: string) =>
    api.post(`/events/${eventId}/participants/undo-delete`, { type, undo_token: undoToken }),
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
  delete: (id: string) => api.delete(`/attendance/${id}`),
  getStats: () => api.get('/attendance/stats/overview'),
  getNoShows: () => api.get('/attendance/no-shows'),
  getNoShowsByParticipant: () => api.get('/attendance/no-shows/by-participant'),
};

// Blocklist API
export const blocklistAPI = {
  add: (data: any) => api.post('/blocklist', data),
  getAll: () => api.get('/blocklist'),
  remove: (participantId: string) => api.delete(`/blocklist/${participantId}`),
};

// Imports API
export const importsAPI = {
  getByEvent: (eventId: string, days: number = 30) => api.get('/imports', { params: { event_id: eventId, days } }),
  getHistoryLast30Days: (eventId: string) => api.get('/imports', { params: { event_id: eventId, days: 30 } }),
  getSession: (sessionId: string) => api.get(`/imports/${sessionId}`),
  delete: (sessionId: string) => api.delete(`/imports/${sessionId}`),
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
