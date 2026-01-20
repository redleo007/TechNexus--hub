import { useState, useEffect } from 'react';
import { XCircle, Download, Plus, Trash2 } from 'lucide-react';
import { attendanceAPI, participantsAPI, eventsAPI } from '../api/client';
import { formatDateTime } from '../utils/formatters';
import './NoShows.css';

interface NoShowRecord {
  id: string;
  event_id: string;
  participant_id: string;
  status: string;
  marked_at: string;
  events: {
    id: string;
    name: string;
    date: string;
  };
  participants: {
    id: string;
    name: string;
    email: string;
  };
}


interface Participant {
  id: string;
  name: string;
  email: string;
  is_blocklisted: boolean;
}

interface Event {
  id: string;
  name: string;
  date: string;
}

export function NoShows() {
  const [noShowRecords, setNoShowRecords] = useState<NoShowRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<NoShowRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    document.title = 'No Shows - TechNexus Community';
    loadData();
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      const [pRes, eRes] = await Promise.all([
        participantsAPI.getAll(false),
        eventsAPI.getAll(),
      ]);
      const participantsData = Array.isArray(pRes) ? pRes : (pRes?.data || []);
      const eventsData = Array.isArray(eRes) ? eRes : (eRes?.data || []);
      
      setParticipants(participantsData);
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to load form data:', error);
      setParticipants([]);
      setEvents([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all no-show records
      const allNoShows = await attendanceAPI.getNoShows().catch(() => ({ data: [] }));
      
      // Handle response - data is already unwrapped by interceptor
      const noShowsData = Array.isArray(allNoShows) ? allNoShows : (allNoShows?.data || []);
      
      setNoShowRecords(noShowsData);
      setFilteredRecords(noShowsData);
    } catch (error) {
      console.error('Failed to load no-shows:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to load no-show records' });
      setNoShowRecords([]);
      setFilteredRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Update filtered records when search changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRecords(noShowRecords);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredRecords(
        noShowRecords.filter(r => 
          r.participants?.name?.toLowerCase().includes(lower) ||
          r.participants?.email?.toLowerCase().includes(lower)
        )
      );
    }
  }, [searchTerm, noShowRecords]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      setMessage({ type: 'error', text: 'No records to export' });
      return;
    }

    const headers = ['Name', 'Email', 'Event', 'Event Date', 'Marked At'];
    const rows = filteredRecords.map(r => [
      r.participants?.name || 'Unknown',
      r.participants?.email || 'N/A',
      r.events?.name || 'Unknown Event',
      r.events?.date || 'N/A',
      formatDateTime(r.marked_at),
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `no-shows-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    setMessage({ type: 'success', text: `Exported ${filteredRecords.length} records` });
  };

  const handleAddNoShow = async () => {
    if (!selectedParticipantId || !selectedEventId) {
      setMessage({ type: 'error', text: 'Please select both participant and event' });
      return;
    }

    try {
      await attendanceAPI.mark({
        participant_id: selectedParticipantId,
        event_id: selectedEventId,
        status: 'no_show',
      });
      
      setMessage({ type: 'success', text: 'No-show record added successfully' });
      setShowAddForm(false);
      setSelectedParticipantId('');
      setSelectedEventId('');
      
      // Reload data to refresh counts and lists
      await loadData();
    } catch (error) {
      console.error('Failed to add no-show:', error);
      setMessage({ type: 'error', text: 'Failed to add no-show record' });
    }
  };

  const handleDeleteNoShow = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this no-show record?')) {
      return;
    }

    try {
      await attendanceAPI.delete(recordId);
      setMessage({ type: 'success', text: 'No-show record deleted successfully' });
      
      // Reload data to refresh counts and lists
      await loadData();
    } catch (error) {
      console.error('Failed to delete no-show:', error);
      setMessage({ type: 'error', text: 'Failed to delete no-show record' });
    }
  };

  if (loading) {
    return (
      <div className="no-shows loading-container">
        <div className="spinner"></div>
        <p>Loading no-show records...</p>
      </div>
    );
  }

  const totalNoShows = noShowRecords.length;

  return (
    <div className="no-shows">
      <div className="page-header">
        <h1>No-Show Records</h1>
        <p>Track participants who missed events</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-icon"><XCircle size={40} /></div>
          <div className="stat-content">
            <h3>Total No-Shows</h3>
            <p className="stat-value">{totalNoShows}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="list-header">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="action-buttons">
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus size={16} /> Add Entry
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="add-form-section">
            <h3>Add No-Show Record</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAddNoShow(); }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Participant</label>
                  <select
                    value={selectedParticipantId}
                    onChange={(e) => setSelectedParticipantId(e.target.value)}
                    required
                  >
                    <option value="">Select participant...</option>
                    {participants
                      .filter(p => !p.is_blocklisted)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.email})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Event</label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    required
                  >
                    <option value="">Select event...</option>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} - {e.date}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Add No-Show
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedParticipantId('');
                    setSelectedEventId('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {filteredRecords.length > 0 ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Email</th>
                  <th>Event</th>
                  <th>Event Date</th>
                  <th>Marked At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.participants?.name || 'Unknown'}</td>
                    <td>{record.participants?.email || 'N/A'}</td>
                    <td>{record.events?.name || 'Unknown Event'}</td>
                    <td>{record.events?.date || 'N/A'}</td>
                    <td>{formatDateTime(record.marked_at)}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteNoShow(record.id)}
                        title="Delete no-show record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>{searchTerm ? 'No matches found' : 'No no-show records'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default NoShows;