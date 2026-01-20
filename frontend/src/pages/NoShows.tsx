import { useState, useEffect } from 'react';
import { XCircle, Download } from 'lucide-react';
import { attendanceAPI } from '../api/client';
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

interface NoShowByParticipant {
  participant_id: string;
  no_show_count: number;
  participant: {
    id: string;
    name: string;
    email: string;
    is_blocklisted: boolean;
  };
}

export function NoShows() {
  const [noShowRecords, setNoShowRecords] = useState<NoShowRecord[]>([]);
  const [noShowsByParticipant, setNoShowsByParticipant] = useState<NoShowByParticipant[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<NoShowRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'by-participant'>('all');

  useEffect(() => {
    document.title = 'No Shows - TechNexus Community';
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allNoShows, byParticipant] = await Promise.all([
        attendanceAPI.getNoShows(),
        attendanceAPI.getNoShowsByParticipant(),
      ]);
      
      setNoShowRecords(allNoShows.data || allNoShows || []);
      setNoShowsByParticipant(byParticipant.data || byParticipant || []);
      setFilteredRecords(allNoShows.data || allNoShows || []);
    } catch (error) {
      console.error('Failed to load no-shows:', error);
      setMessage({ type: 'error', text: 'Failed to load no-show records' });
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
    const dataToExport = viewMode === 'all' ? filteredRecords : noShowsByParticipant;
    
    if (dataToExport.length === 0) {
      setMessage({ type: 'error', text: 'No records to export' });
      return;
    }

    let csv: string;
    if (viewMode === 'all') {
      const headers = ['Name', 'Email', 'Event', 'Event Date', 'Marked At'];
      const rows = (dataToExport as NoShowRecord[]).map(r => [
        r.participants?.name || 'Unknown',
        r.participants?.email || 'N/A',
        r.events?.name || 'Unknown Event',
        r.events?.date || 'N/A',
        formatDateTime(r.marked_at),
      ]);
      csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    } else {
      const headers = ['Name', 'Email', 'No-Show Count', 'Blocklisted'];
      const rows = (dataToExport as NoShowByParticipant[]).map(r => [
        r.participant?.name || 'Unknown',
        r.participant?.email || 'N/A',
        r.no_show_count.toString(),
        r.participant?.is_blocklisted ? 'Yes' : 'No',
      ]);
      csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `no-shows-${viewMode}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    setMessage({ type: 'success', text: `Exported ${dataToExport.length} records` });
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
  const uniqueParticipants = noShowsByParticipant.length;

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
        <div className="stat-card stat-card-danger">
          <div className="stat-icon"><XCircle size={40} /></div>
          <div className="stat-content">
            <h3>Total No-Shows</h3>
            <p className="stat-value">{totalNoShows}</p>
          </div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-icon"><XCircle size={40} /></div>
          <div className="stat-content">
            <h3>Unique Participants</h3>
            <p className="stat-value">{uniqueParticipants}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="list-header">
          <div className="view-tabs">
            <button 
              className={`tab ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              All No-Shows ({totalNoShows})
            </button>
            <button 
              className={`tab ${viewMode === 'by-participant' ? 'active' : ''}`}
              onClick={() => setViewMode('by-participant')}
            >
              By Participant ({uniqueParticipants})
            </button>
          </div>
          
          {viewMode === 'all' && (
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
          
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
          </button>
        </div>

        {viewMode === 'all' ? (
          filteredRecords.length > 0 ? (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Email</th>
                    <th>Event</th>
                    <th>Event Date</th>
                    <th>Marked At</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>{searchTerm ? 'No matches found' : 'No no-show records'}</p>
            </div>
          )
        ) : (
          noShowsByParticipant.length > 0 ? (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Email</th>
                    <th>No-Show Count</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {noShowsByParticipant
                    .sort((a, b) => b.no_show_count - a.no_show_count)
                    .map((record) => (
                      <tr key={record.participant_id}>
                        <td>{record.participant?.name || 'Unknown'}</td>
                        <td>{record.participant?.email || 'N/A'}</td>
                        <td>
                          <span className={`badge ${record.no_show_count >= 2 ? 'badge-danger' : 'badge-warning'}`}>
                            {record.no_show_count}
                          </span>
                        </td>
                        <td>
                          {record.participant?.is_blocklisted ? (
                            <span className="badge badge-danger">Blocklisted</span>
                          ) : record.no_show_count >= 2 ? (
                            <span className="badge badge-warning">Should be blocklisted</span>
                          ) : (
                            <span className="badge badge-secondary">Active</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>No no-show records</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default NoShows;
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
