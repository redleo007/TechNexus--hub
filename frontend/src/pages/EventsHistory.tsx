import { useState, useEffect } from 'react';
import { Calendar, BarChart3, MapPin, CheckCircle, XCircle, Check, X, Users, Trash2 } from 'lucide-react';
import { eventsAPI, attendanceAPI, volunteersAPI } from '../api/client';
import { AttendanceStatusBadge } from '../components/AttendanceStatusBadge';
import { useAsync } from '../utils/hooks';
import { formatDate, formatDateTime } from '../utils/formatters';
import './EventsHistory.css';

interface Event {
  id: string;
  name: string;
  date: string;
  location?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface AttendanceRecord {
  id: string;
  participant_id: string;
  event_id: string;
  status: 'attended' | 'no_show';
  marked_at: string;
  participant_name?: string;
}

interface VolunteerAttendanceRecord {
  id: string;
  volunteer_id: string;
  event_id: string;
  volunteer_name?: string;
  status: 'attended' | 'no_show' | 'not_recorded';
  attendance_date?: string;
}

interface EventStats {
  total: number;
  attended: number;
  noShow: number;
  attendance: AttendanceRecord[];
}

type FilterType = 'all' | 'confirmed' | 'no_show';
type TabType = 'participants' | 'volunteers';

export function EventsHistory() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeTab, setActiveTab] = useState<TabType>('participants');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [volunteerAttendance, setVolunteerAttendance] = useState<VolunteerAttendanceRecord[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: events, loading } = useAsync<Event[]>(
    () => eventsAPI.getAll().then((res) => res.data),
    true
  );

  // Load event stats when selected event changes
  useEffect(() => {
    if (!selectedEventId) {
      setEventStats(null);
      return;
    }

    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const attendance = await attendanceAPI.getByEvent(selectedEventId);
        const records = attendance.data || [];

        const stats: EventStats = {
          total: records.length,
          attended: records.filter((r: AttendanceRecord) => r.status === 'attended').length,
          noShow: records.filter((r: AttendanceRecord) => r.status === 'no_show').length,
          attendance: records,
        };

        setEventStats(stats);
      } catch (error) {
        console.error('Failed to load event stats:', error);
        setEventStats(null);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [selectedEventId]);

  // Load volunteer attendance when event changes - use real API endpoint
  useEffect(() => {
    if (!selectedEventId) {
      setVolunteerAttendance([]);
      return;
    }

    const loadVolunteerAttendance = async () => {
      setLoadingVolunteers(true);
      try {
        // Use real API endpoint: GET /events/{event_id}/volunteer-attendance
        const response = await volunteersAPI.getAttendanceByEvent(selectedEventId);
        const data = response.data || [];
        
        // Transform data to include not_recorded status if needed
        const transformedData: VolunteerAttendanceRecord[] = data.map((record: any) => ({
          id: record.id,
          volunteer_id: record.volunteer_id,
          event_id: record.event_id,
          volunteer_name: record.volunteer_name,
          status: record.status || 'not_recorded',
          attendance_date: record.attendance_date || events?.find(e => e.id === selectedEventId)?.date,
        }));

        setVolunteerAttendance(transformedData);
      } catch (error) {
        // If endpoint doesn't exist yet, show empty state
        setVolunteerAttendance([]);
      } finally {
        setLoadingVolunteers(false);
      }
    };

    loadVolunteerAttendance();
  }, [selectedEventId, events]);

  const selectedEvent = events?.find((e) => e.id === selectedEventId);

  const filteredAttendance = eventStats?.attendance.filter((record) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'confirmed' && record.status === 'attended') ||
      (filter === 'no_show' && record.status === 'no_show');

    return matchesFilter;
  }) || [];

  const getFilteredStats = () => {
    if (!eventStats) return { total: 0, attended: 0, noShow: 0 };
    if (filter === 'all') return eventStats;
    if (filter === 'confirmed') {
      return {
        total: eventStats.attended,
        attended: eventStats.attended,
        noShow: 0,
      };
    }
    return {
      total: eventStats.noShow,
      attended: 0,
      noShow: eventStats.noShow,
    };
  };

  const stats = getFilteredStats();

  const filteredEvents =
    events?.filter((event) =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  // Handle deletion of volunteer attendance
  const handleDeleteVolunteerAttendance = async (volunteerAttendanceId: string) => {
    if (!confirm('Delete this volunteer attendance record?')) return;

    try {
      await volunteersAPI.deleteAttendance(volunteerAttendanceId);
      setMessage({ type: 'success', text: 'Attendance record deleted' });
      
      // Reload volunteer attendance
      if (selectedEventId) {
        const response = await volunteersAPI.getAttendanceByEvent(selectedEventId);
        const data = response.data || [];
        setVolunteerAttendance(data);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete attendance record' });
      console.error('Error deleting attendance:', error);
    }
  };

  const handleDeleteAllVolunteerAttendance = async () => {
    if (!selectedEventId) return;

    try {
      await volunteersAPI.deleteAllAttendanceForEvent(selectedEventId);
      setMessage({ type: 'success', text: 'All volunteer attendance records deleted for this event' });
      
      // Clear volunteer attendance
      setVolunteerAttendance([]);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete volunteer attendance records' });
      console.error('Error deleting all attendance:', error);
    }
  };

  if (loading) {
    return (
      <div className="events-history loading-container">
        <div className="spinner"></div>
        <p>Loading events history...</p>
      </div>
    );
  }

  return (
    <div className="events-history">
      <div className="page-header">
        <h1>Events History</h1>
        <p>View event details and attendance history</p>
      </div>

      {message && (
        <div className={`message-banner ${message.type}`}>
          <p>{message.text}</p>
          <button onClick={() => setMessage(null)} style={{ marginLeft: '8px', cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>✕</button>
        </div>
      )}

      <div className="history-layout">
        {/* Events List */}
        <div className="events-list-panel">
          <div className="panel-header">
            <h2>Events</h2>
            <span className="event-count">{filteredEvents.length}</span>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="events-list">
            {filteredEvents.length === 0 ? (
              <div className="empty-state">
                <p>No events found</p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className={`event-item ${selectedEventId === event.id ? 'active' : ''}`}
                  onClick={() => setSelectedEventId(event.id)}
                >
                  <div className="event-item-header">
                    <h3>{event.name}</h3>
                    <span className="event-date">
                      {formatDate(event.date)}
                    </span>
                  </div>
                  {event.location && (
                    <p className="event-location"><MapPin size={16} style={{ display: 'inline', marginRight: '4px' }} /> {event.location}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Event Details */}
        <div className="event-details-panel">
          {!selectedEventId ? (
            <div className="empty-state">
              <p>Select an event to view details</p>
            </div>
          ) : loadingStats && activeTab === 'participants' ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading event details...</p>
            </div>
          ) : selectedEvent ? (
            <>
              {/* Event Header */}
              <div className="event-header">
                <div>
                  <h2>{selectedEvent.name}</h2>
                  <p className="event-meta">
                    <Calendar size={16} style={{ display: 'inline', marginRight: '4px' }} /> {formatDate(selectedEvent.date)}
                    {selectedEvent.location && ` • `}<MapPin size={14} style={{ display: 'inline', marginLeft: '4px', marginRight: '4px' }} />{selectedEvent.location && selectedEvent.location}
                  </p>
                  {selectedEvent.description && (
                    <p className="event-description">{selectedEvent.description}</p>
                  )}
                </div>
                <div className="event-dates">
                  <div className="date-info">
                    <span className="label">Created</span>
                    <span className="value">{formatDateTime(selectedEvent.created_at)}</span>
                  </div>
                  <div className="date-info">
                    <span className="label">Updated</span>
                    <span className="value">{formatDateTime(selectedEvent.updated_at)}</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="event-tabs" style={{
                display: 'flex',
                gap: '16px',
                borderBottom: '1px solid #eee',
                marginBottom: '20px'
              }}>
                <button
                  className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
                  onClick={() => setActiveTab('participants')}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: activeTab === 'participants' ? '600' : '500',
                    color: activeTab === 'participants' ? 'var(--primary-color)' : 'var(--text-secondary)',
                    borderBottom: activeTab === 'participants' ? '2px solid var(--primary-color)' : 'none',
                    marginBottom: '-1px'
                  }}
                >
                  Participant Attendance
                </button>
                <button
                  className={`tab-btn ${activeTab === 'volunteers' ? 'active' : ''}`}
                  onClick={() => setActiveTab('volunteers')}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: activeTab === 'volunteers' ? '600' : '500',
                    color: activeTab === 'volunteers' ? 'var(--primary-color)' : 'var(--text-secondary)',
                    borderBottom: activeTab === 'volunteers' ? '2px solid var(--primary-color)' : 'none',
                    marginBottom: '-1px'
                  }}
                >
                  <Users size={16} style={{ display: 'inline', marginRight: '6px' }} />
                  Volunteer Attendance
                </button>
              </div>

              {activeTab === 'participants' && (
              <>

              {/* Stats Cards */}
              <div className="stats-section">
                <div className="stat-card stat-card-total">
                  <div className="stat-icon"><BarChart3 size={40} /></div>
                  <div className="stat-content">
                    <span className="stat-label">Total Attendance</span>
                    <span className="stat-value">{stats.total}</span>
                  </div>
                </div>
                <div className="stat-card stat-card-confirmed">
                  <div className="stat-icon"><CheckCircle size={40} /></div>
                  <div className="stat-content">
                    <span className="stat-label">Confirmed</span>
                    <span className="stat-value">{stats.attended}</span>
                  </div>
                </div>
                <div className="stat-card stat-card-no-show">
                  <div className="stat-icon"><XCircle size={40} /></div>
                  <div className="stat-content">
                    <span className="stat-label">No-Shows</span>
                    <span className="stat-value">{stats.noShow}</span>
                  </div>
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All ({eventStats?.total || 0})
                </button>
                <button
                  className={`filter-btn ${filter === 'confirmed' ? 'active' : ''}`}
                  onClick={() => setFilter('confirmed')}
                >
                  Confirmed ({eventStats?.attended || 0})
                </button>
                <button
                  className={`filter-btn ${filter === 'no_show' ? 'active' : ''}`}
                  onClick={() => setFilter('no_show')}
                >
                  No-Shows ({eventStats?.noShow || 0})
                </button>
              </div>

              {/* Attendance Table */}
              <div className="attendance-section">
                <h3>Attendance Records ({filteredAttendance.length})</h3>
                {filteredAttendance.length === 0 ? (
                  <div className="empty-state">
                    <p>
                      {filter === 'all'
                        ? 'No attendance records'
                        : filter === 'confirmed'
                          ? 'No confirmed attendees'
                          : 'No no-shows'}
                    </p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Participant</th>
                          <th>Status</th>
                          <th>Marked At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAttendance
                          .sort(
                            (a, b) =>
                              new Date(b.marked_at).getTime() -
                              new Date(a.marked_at).getTime()
                          )
                          .map((record) => (
                            <tr key={record.id}>
                              <td className="participant-name">
                                {record.participant_name || 'Unknown'}
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    record.status === 'attended'
                                      ? 'badge-success'
                                      : 'badge-danger'
                                  }`}
                                >
                                  {record.status === 'attended'
                                    ? <><Check size={14} /> Attended</>
                                    : <><X size={14} /> No-Show</>}
                                </span>
                              </td>
                              <td className="marked-at">
                                {formatDateTime(record.marked_at)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              </>
              )}

              {activeTab === 'volunteers' && (
              <>
              <div className="volunteer-attendance-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0 }}>Volunteer Attendance ({volunteerAttendance.length})</h3>
                  {volunteerAttendance.length > 0 && (
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        if (confirm('Delete all volunteer attendance for this event? This cannot be undone.')) {
                          handleDeleteAllVolunteerAttendance();
                        }
                      }}
                      title="Delete all volunteer attendance records"
                    >
                      <Trash2 size={16} style={{ marginRight: '4px' }} />
                      Delete All
                    </button>
                  )}
                </div>
                {loadingVolunteers ? (
                  <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading volunteer attendance...</p>
                  </div>
                ) : volunteerAttendance.length === 0 ? (
                  <div className="empty-state">
                    <p>No volunteer attendance data. Volunteers must be imported through the attendance import process.</p>
                  </div>
                ) : (
                  <div className="volunteer-list">
                    {volunteerAttendance.map((record) => (
                      <div key={record.id} className="volunteer-attendance-row">
                        <div className="volunteer-info">
                          <h4>{record.volunteer_name || 'Unknown Volunteer'}</h4>
                          <p style={{ fontSize: '0.85rem', color: '#999' }}>
                            {formatDate(record.attendance_date || selectedEvent?.date || '')}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <AttendanceStatusBadge
                            status={record.status === 'attended' ? 'attended' : record.status === 'no_show' ? 'no_show' : 'not_recorded'}
                            size="sm"
                          />
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteVolunteerAttendance(record.id)}
                            title="Delete attendance record"
                            style={{ padding: '4px 8px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
