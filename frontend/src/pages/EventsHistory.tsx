import { useState, useEffect } from 'react';
import { Calendar, BarChart3, MapPin, CheckCircle, XCircle, Check, X } from 'lucide-react';
import { eventsAPI, attendanceAPI } from '../api/client';
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

interface EventStats {
  total: number;
  attended: number;
  noShow: number;
  attendance: AttendanceRecord[];
}

type FilterType = 'all' | 'confirmed' | 'no_show';

export function EventsHistory() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
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
          ) : loadingStats ? (
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
                <h3 style={{ margin: 0 }}>Attendance Records</h3>
              </div>

              {selectedEventId && (
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
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
