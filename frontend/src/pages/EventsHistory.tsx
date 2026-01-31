import { useState, useEffect, useCallback } from 'react';
import Icon from '../components/Icon';
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

interface Participant {
  id: string;
  name: string;
  email: string;
  is_blocklisted: boolean;
}

interface AttendanceRecord {
  id: string;
  participant_id: string;
  event_id: string;
  status: 'attended' | 'no_show' | 'not_attended';
  marked_at: string;
  participant_name?: string;
  participants?: Participant;
}

interface EventStats {
  total: number;
  attended: number;
  noShow: number;
  attendance: AttendanceRecord[];
  participants: Participant[];
}

export function EventsHistory() {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);

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
        // Fetch both attendance and participants in parallel
        const [attendanceRes, participantsRes] = await Promise.all([
          attendanceAPI.getByEvent(selectedEventId),
          eventsAPI.getParticipants(selectedEventId),
        ]);
        
        // Properly extract records from response
        let records: AttendanceRecord[] = [];
        if (Array.isArray(attendanceRes)) {
          records = attendanceRes;
        } else if (attendanceRes && typeof attendanceRes === 'object') {
          records = attendanceRes.data && Array.isArray(attendanceRes.data) ? attendanceRes.data : [];
        }

        // Extract participants
        let participants: Participant[] = [];
        if (Array.isArray(participantsRes)) {
          participants = participantsRes;
        } else if (participantsRes && typeof participantsRes === 'object') {
          participants = participantsRes.data && Array.isArray(participantsRes.data) ? participantsRes.data : [];
        }

        const stats: EventStats = {
          total: records.length,
          attended: records.filter((r: AttendanceRecord) => r.status === 'attended').length,
          noShow: records.filter((r: AttendanceRecord) => r.status === 'no_show' || r.status === 'not_attended').length,
          attendance: records,
          participants: participants,
        };

        setEventStats(stats);
      } catch (error) {
        console.error('Failed to load event stats:', error);
        setEventStats(null);
        setMessage({ type: 'error', text: 'Failed to load event details' });
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [selectedEventId]);

  // Export participants to CSV (matches import format: Full Name, Event Pass)
  const exportParticipantsCSV = useCallback(async (event: Event) => {
    setExporting(true);
    try {
      const participantsRes = await eventsAPI.getParticipants(event.id);
      
      let participants: Participant[] = [];
      if (Array.isArray(participantsRes)) {
        participants = participantsRes;
      } else if (participantsRes && typeof participantsRes === 'object') {
        participants = participantsRes.data && Array.isArray(participantsRes.data) ? participantsRes.data : [];
      }

      if (participants.length === 0) {
        setMessage({ type: 'error', text: 'No participants found for this event' });
        return;
      }

      // Create CSV content matching import format (Full Name, Event Pass)
      const headers = ['Full Name', 'Event Pass'];
      const rows = participants.map((p: Participant, index: number) => {
        // Generate event pass code if not available (TNX_EVENT_XXX format)
        const eventCode = event.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
        const passCode = `TNX_${eventCode}_${String(index + 1).padStart(3, '0')}`;
        return [
          `"${(p.name || '').replace(/"/g, '""')}"`,
          passCode
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = event.name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      link.download = `${safeName}_participants_${formatDate(event.date)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `Exported ${participants.length} participants` });
    } catch (error) {
      console.error('Export failed:', error);
      setMessage({ type: 'error', text: 'Failed to export participants' });
    } finally {
      setExporting(false);
    }
  }, []);

  // Export attendance to CSV (matches import format: Name, Email, Status)
  const exportAttendanceCSV = useCallback(async (event: Event) => {
    setExporting(true);
    try {
      const attendanceRes = await eventsAPI.getAttendance(event.id);
      
      let records: any[] = [];
      if (Array.isArray(attendanceRes)) {
        records = attendanceRes;
      } else if (attendanceRes && typeof attendanceRes === 'object') {
        records = attendanceRes.data && Array.isArray(attendanceRes.data) ? attendanceRes.data : [];
      }

      if (records.length === 0) {
        setMessage({ type: 'error', text: 'No attendance records found for this event' });
        return;
      }

      // Create CSV content matching import format (Name, Email, Status)
      const headers = ['Name', 'Email', 'Status'];
      const rows = records.map((r: any) => {
        const participant = r.participants || {};
        // Map status to import-compatible format
        const statusLabel = r.status === 'attended' ? 'attended' : 'not attended';
        return [
          `"${(participant.name || '').replace(/"/g, '""')}"`,
          `"${(participant.email || '').replace(/"/g, '""')}"`,
          statusLabel
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = event.name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      link.download = `${safeName}_attendance_${formatDate(event.date)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `Exported ${records.length} attendance records` });
    } catch (error) {
      console.error('Export failed:', error);
      setMessage({ type: 'error', text: 'Failed to export attendance' });
    } finally {
      setExporting(false);
    }
  }, []);

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
                      <Icon name="calendar" alt="Event date" sizePx={16} />
                      {formatDate(event.date)}
                    </span>
                  </div>
                  {event.location && (
                    <p className="event-location">
                      <Icon name="mapPin" alt="Location" sizePx={16} />
                      {event.location}
                    </p>
                  )}
                  <div className="event-item-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => exportParticipantsCSV(event)}
                      disabled={exporting}
                      title="Export participants to CSV"
                    >
                      <Icon name="download" alt="Export" sizePx={14} /> Export
                    </button>
                  </div>
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
                    <span className="meta-date">
                      <Icon name="calendar" alt="Event date" sizePx={16} />
                      {formatDate(selectedEvent.date)}
                    </span>
                    {selectedEvent.location && (
                      <span className="meta-location">
                        <Icon name="mapPin" alt="Location" sizePx={16} />
                        {selectedEvent.location}
                      </span>
                    )}
                  </p>
                  {selectedEvent.description && (
                    <p className="event-description">{selectedEvent.description}</p>
                  )}
                </div>
                <div className="event-actions-row">
                  <button
                    className="btn btn-primary"
                    onClick={() => exportParticipantsCSV(selectedEvent)}
                    disabled={exporting}
                  >
                    <Icon name="download" alt="Export" sizePx={16} />
                    {exporting ? 'Exporting...' : 'Export Participants'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => exportAttendanceCSV(selectedEvent)}
                    disabled={exporting}
                  >
                    <Icon name="download" alt="Export" sizePx={16} />
                    {exporting ? 'Exporting...' : 'Export Attendance'}
                  </button>
                </div>
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
                  <div className="stat-icon"><Icon name="chart" alt="Total" sizePx={40} /></div>
                  <div className="stat-content">
                    <span className="stat-label">Total Attendance</span>
                    <span className="stat-value">{stats.total}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><Icon name="success" alt="Confirmed" sizePx={40} /></div>
                  <div className="stat-content">
                    <span className="stat-label">Confirmed</span>
                    <span className="stat-value">{stats.attended}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><Icon name="error" alt="No shows" sizePx={40} /></div>
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
