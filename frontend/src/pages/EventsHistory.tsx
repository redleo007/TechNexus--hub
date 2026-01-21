import { useState, useEffect } from 'react';
import { BarChart3, CheckCircle, XCircle } from 'lucide-react';
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
  status: 'attended' | 'no_show' | 'not_attended';
  marked_at: string;
  participant_name?: string;
}

interface EventStats {
  total: number;
  attended: number;
  noShow: number;
  attendance: AttendanceRecord[];
}

export function EventsHistory() {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    document.title = 'Events History - TechNexus Community';
  }, []);

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
        console.log('Attendance response:', attendance);
        
        // Properly extract records from response
        let records: AttendanceRecord[] = [];
        
        if (Array.isArray(attendance)) {
          records = attendance;
        } else if (attendance && typeof attendance === 'object') {
          records = attendance.data && Array.isArray(attendance.data) ? attendance.data : [];
        }

        const stats: EventStats = {
          total: records.length,
          attended: records.filter((r: AttendanceRecord) => r.status === 'attended').length,
          noShow: records.filter((r: AttendanceRecord) => r.status === 'no_show' || r.status === 'not_attended').length,
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

  const getFilteredStats = () => {
    if (!eventStats) return { total: 0, attended: 0, noShow: 0 };
    return eventStats;
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
                    <p className="event-location">{event.location}</p>
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
                    <span className="meta-date">{formatDate(selectedEvent.date)}</span>
                    {selectedEvent.location && (
                      <span className="meta-location">{selectedEvent.location}</span>
                    )}
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
                <div className="stat-card">
                  <div className="stat-icon"><BarChart3 size={40} /></div>
                  <div className="stat-content">
                    <span className="stat-label">Total Attendance</span>
                    <span className="stat-value">{stats.total}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><CheckCircle size={40} /></div>
                  <div className="stat-content">
                    <span className="stat-label">Confirmed</span>
                    <span className="stat-value">{stats.attended}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><XCircle size={40} /></div>
                  <div className="stat-content">
                    <span className="stat-label">No-Shows</span>
                    <span className="stat-value">{stats.noShow}</span>
                  </div>
                </div>
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
