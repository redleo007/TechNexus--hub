import { useState, useEffect } from 'react';
import { Trash2, Plus, Download } from 'lucide-react';
import { attendanceAPI, participantsAPI, eventsAPI } from '../api/client';
import './NoShows.css';

interface NoShowRecord {
  id: string;
  event_id: string;
  participant_id: string;
  participant_name: string;
  event_name: string;
  date: string;
  marked_at: string;
}

interface Participant {
  id: string;
  name: string;
  email: string;
}

interface Event {
  id: string;
  name: string;
  date?: string;
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
  }, []);

  // Load participants and events
  useEffect(() => {
    const loadData = async () => {
      try {
        const [pRes, eRes] = await Promise.all([
          participantsAPI.getAll(false),
          eventsAPI.getAll(),
        ]);
        setParticipants(pRes.data || []);
        setEvents(eRes.data || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  // Load no-show records
  useEffect(() => {
    const loadNoShows = async () => {
      setLoading(true);
      try {
        const records: NoShowRecord[] = [];
        for (const event of events) {
          const attendance = await attendanceAPI.getByEvent(event.id);
          for (const record of attendance.data || []) {
            if (record.status === 'no_show') {
              const participant = participants.find(p => p.id === record.participant_id);
              if (participant) {
                records.push({
                  id: record.id,
                  event_id: event.id,
                  participant_id: record.participant_id,
                  participant_name: participant.name,
                  event_name: event.name,
                  date: event.date || '',
                  marked_at: record.marked_at,
                });
              }
            }
          }
        }
        setNoShowRecords(records);
        updateFilter(records, searchTerm);
      } catch (error) {
        console.error('Failed to load no-shows:', error);
        setMessage({ type: 'error', text: 'Failed to load no-show records' });
      } finally {
        setLoading(false);
      }
    };

    if (events.length > 0 && participants.length > 0) {
      loadNoShows();
    }
  }, [events, participants]);

  // Update filtered records when search changes
  useEffect(() => {
    updateFilter(noShowRecords, searchTerm);
  }, [searchTerm, noShowRecords]);

  const updateFilter = (records: NoShowRecord[], term: string) => {
    if (!term.trim()) {
      setFilteredRecords(records);
    } else {
      const lower = term.toLowerCase();
      setFilteredRecords(
        records.filter(r => r.participant_name.toLowerCase().includes(lower))
      );
    }
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      setMessage({ type: 'error', text: 'No records to export' });
      return;
    }

    const headers = ['Name', 'Email', 'Event', 'Event Date', 'Marked At'];
    const rows = filteredRecords.map(r => [
      r.participant_name,
      participants.find(p => p.id === r.participant_id)?.email || '',
      r.event_name,
      r.date,
      new Date(r.marked_at).toLocaleString(),
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `no-shows-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAddRecord = async () => {
    if (!selectedParticipantId || !selectedEventId) {
      setMessage({ type: 'error', text: 'Please select participant and event' });
      return;
    }

    try {
      await attendanceAPI.mark({ participant_id: selectedParticipantId, event_id: selectedEventId, status: 'no_show' });
      setMessage({ type: 'success', text: 'No-show record added' });
      setShowAddForm(false);
      setSelectedParticipantId('');
      setSelectedEventId('');
      
      // Reload records
      const records: NoShowRecord[] = [];
      for (const event of events) {
        const attendance = await attendanceAPI.getByEvent(event.id);
        for (const record of attendance.data || []) {
          if (record.status === 'no_show') {
            const participant = participants.find(p => p.id === record.participant_id);
            if (participant) {
              records.push({
                id: record.id,
                event_id: event.id,
                participant_id: record.participant_id,
                participant_name: participant.name,
                event_name: event.name,
                date: event.date || '',
                marked_at: record.marked_at,
              });
            }
          }
        }
      }
      setNoShowRecords(records);
      updateFilter(records, searchTerm);
    } catch (error) {
      console.error('Failed to add no-show record:', error);
      setMessage({ type: 'error', text: 'Failed to add record' });
    }
  };

  const handleRemoveRecord = async (recordId: string) => {
    try {
      // Find the record to get participant and event IDs
      const record = noShowRecords.find(r => r.id === recordId);
      if (!record) return;

      await attendanceAPI.mark({ participant_id: record.participant_id, event_id: record.event_id, status: 'attended' });
      setMessage({ type: 'success', text: 'No-show record removed' });
      
      // Remove from state
      setNoShowRecords(prev => prev.filter(r => r.id !== recordId));
      updateFilter(
        noShowRecords.filter(r => r.id !== recordId),
        searchTerm
      );
    } catch (error) {
      console.error('Failed to remove record:', error);
      setMessage({ type: 'error', text: 'Failed to remove record' });
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

  return (
    <div className="no-shows">
      <div className="page-header">
        <h1>No-Show Management</h1>
        <p>Search, export, and manually manage no-show records</p>
      </div>

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="list-header">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search by participant name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="action-buttons">
          <button
            className="btn btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={18} /> Add Record
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleExportCSV}
          >
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="add-form-section">
          <h3>Add No-Show Record</h3>
          <div className="form-group">
            <label>Participant</label>
            <select
              value={selectedParticipantId}
              onChange={e => setSelectedParticipantId(e.target.value)}
            >
              <option value="">Select participant...</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Event</label>
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
            >
              <option value="">Select event...</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleAddRecord}>
              Add Record
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="no-show-items">
        {filteredRecords.length === 0 ? (
          <div className="empty-state">
            <p>{searchTerm ? 'No matching records found' : 'No no-show records'}</p>
          </div>
        ) : (
          filteredRecords.map(record => (
            <div key={record.id} className="no-show-item">
              <div className="item-content">
                <div className="item-header">
                  <h4>{record.participant_name}</h4>
                  <span className="item-meta">{record.event_name}</span>
                </div>
                <p className="item-date">
                  {new Date(record.marked_at).toLocaleString()}
                </p>
              </div>
              <button
                className="btn btn-icon btn-danger"
                onClick={() => handleRemoveRecord(record.id)}
                title="Remove record"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
