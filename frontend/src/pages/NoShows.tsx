import { useState, useEffect } from 'react';
import { attendanceAPI, participantsAPI, eventsAPI, blocklistAPI } from '../api/client';
import { useAsync } from '../utils/hooks';
import { formatDate, formatDateTime } from '../utils/formatters';
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
  is_blocklisted: boolean;
}

interface Event {
  id: string;
  name: string;
  date?: string;
}

export function NoShows() {
  const [noShowRecords, setNoShowRecords] = useState<NoShowRecord[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<string>('');
  const [noShowCounts, setNoShowCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [blocklistData, setBlocklistData] = useState<any[]>([]);

  const { data: events } = useAsync<Event[]>(
    () => eventsAPI.getAll().then((res) => res.data),
    true
  );

  const { data: participants } = useAsync<Participant[]>(
    () => participantsAPI.getAll(true).then((res) => res.data),
    true
  );

  // Load blocklist data
  useEffect(() => {
    const loadBlocklist = async () => {
      try {
        const res = await blocklistAPI.getAll();
        setBlocklistData(res.data || []);
      } catch (error) {
        console.error('Failed to load blocklist:', error);
      }
    };
    loadBlocklist();
  }, []);

  useEffect(() => {
    const loadNoShows = async () => {
      setLoading(true);
      try {
        if (!events || !participants) return;

        let records: NoShowRecord[] = [];
        const counts: { [key: string]: number } = {};

        // Get all attendance records
        for (const event of events) {
          const attendance = await attendanceAPI.getByEvent(event.id);
          for (const record of attendance.data || []) {
            if (record.status === 'no_show') {
              const participant = participants.find(
                (p) => p.id === record.participant_id
              );
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

                counts[record.participant_id] =
                  (counts[record.participant_id] || 0) + 1;
              }
            }
          }
        }

        setNoShowRecords(records.sort((a, b) => new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime()));
        setNoShowCounts(counts);
      } catch (error) {
        console.error('Failed to load no-shows:', error);
      } finally {
        setLoading(false);
      }
    };

    if (events && participants) {
      loadNoShows();
    }
  }, [events, participants]);

  const filteredRecords = selectedParticipant
    ? noShowRecords.filter((r) => r.participant_id === selectedParticipant)
    : noShowRecords;

  const participantStats = participants?.map((p) => {
    const participantNoShows = noShowRecords.filter(r => r.participant_id === p.id);
    const noShowCount = noShowCounts[p.id] || 0;
    const isBlocklisted = blocklistData.some(b => b.participant_id === p.id);
    
    return {
      ...p,
      noShowCount,
      noShowRecords: participantNoShows,
      is_blocklisted: p.is_blocklisted || isBlocklisted,
      criticalSince: noShowCount >= 2 && participantNoShows.length >= 2 
        ? participantNoShows.sort((a, b) => new Date(a.marked_at).getTime() - new Date(b.marked_at).getTime())[1].marked_at
        : undefined,
    };
  }) || [];

  const criticalParticipants = participantStats.filter((p) => p.noShowCount >= 2);

  const selectedParticipantData = participantStats.find(p => p.id === selectedParticipant);

  if (loading) {
    return (
      <div className="no-shows loading-container">
        <div className="spinner"></div>
        <p>Loading no-show data...</p>
      </div>
    );
  }

  return (
    <div className="no-shows">
      <div className="page-header">
        <h1>No-Show Management</h1>
        <p>Track and manage participant no-shows with complete history</p>
      </div>

      <div className="stats-section">
        <div className="stat-card stat-card-warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>Total No-Shows</h3>
            <p className="stat-value">{noShowRecords.length}</p>
          </div>
        </div>

        <div className="stat-card stat-card-danger">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <h3>Critical (2+)</h3>
            <p className="stat-value">{criticalParticipants.length}</p>
          </div>
        </div>

        <div className="stat-card stat-card-blocklisted">
          <div className="stat-icon">🚫</div>
          <div className="stat-content">
            <h3>Blocklisted</h3>
            <p className="stat-value">{criticalParticipants.filter(p => p.is_blocklisted).length}</p>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="card">
          <h2>Participant No-Show History</h2>
          <div className="participant-list">
            {participantStats.length === 0 ? (
              <p className="empty-text">No participants with no-shows</p>
            ) : (
              participantStats
                .filter((p) => p.noShowCount > 0)
                .sort((a, b) => b.noShowCount - a.noShowCount)
                .map((p) => (
                  <div
                    key={p.id}
                    className={`participant-item ${
                      selectedParticipant === p.id ? 'active' : ''
                    } ${p.noShowCount >= 2 ? 'critical' : ''}`}
                    onClick={() =>
                      setSelectedParticipant(
                        selectedParticipant === p.id ? '' : p.id
                      )
                    }
                  >
                    <div className="participant-info">
                      <h4>{p.name}</h4>
                      <p>{p.email}</p>
                      {p.noShowCount >= 2 && (
                        <p className="critical-since">
                          🚨 Critical since {formatDate(p.criticalSince || '')}
                        </p>
                      )}
                    </div>
                    <div className="no-show-badges">
                      <span className={`badge badge-${p.noShowCount >= 2 ? 'danger' : 'warning'}`}>
                        {p.noShowCount} no-show{p.noShowCount > 1 ? 's' : ''}
                      </span>
                      {p.is_blocklisted && (
                        <span className="badge badge-blocklisted">🚫 Blocklisted</span>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="card">
          <h2>
            {selectedParticipant
              ? `${selectedParticipantData?.name} - No-Show History (${filteredRecords.length})`
              : 'All No-Show Records'}
          </h2>

          {selectedParticipant && selectedParticipantData && (
            <div className="selected-participant-summary">
              <div className="summary-item">
                <span className="label">Email:</span>
                <span className="value">{selectedParticipantData.email}</span>
              </div>
              <div className="summary-item">
                <span className="label">Total No-Shows:</span>
                <span className="value">{selectedParticipantData.noShowCount}</span>
              </div>
              {selectedParticipantData.noShowCount >= 2 && (
                <div className="summary-item critical">
                  <span className="label">Critical Status:</span>
                  <span className="value">Since {formatDateTime(selectedParticipantData.criticalSince || '')}</span>
                </div>
              )}
              {selectedParticipantData.is_blocklisted && (
                <div className="summary-item blocklisted">
                  <span className="label">Status:</span>
                  <span className="value">🚫 Added to Blocklist</span>
                </div>
              )}
            </div>
          )}

          <div className="records-list">
            {filteredRecords.length === 0 ? (
              <p className="empty-text">
                {selectedParticipant
                  ? 'No records for this participant'
                  : 'No no-show records found'}
              </p>
            ) : (
              <div className="timeline">
                {filteredRecords
                  .sort((a, b) => new Date(a.marked_at).getTime() - new Date(b.marked_at).getTime())
                  .map((record, index) => (
                    <div key={record.id} className="timeline-item">
                      <div className="timeline-marker">
                        <div className="marker-dot"></div>
                        {index < filteredRecords.length - 1 && <div className="marker-line"></div>}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="event-name">{record.event_name}</span>
                          <span className="badge badge-danger">No-Show #{index + 1}</span>
                        </div>
                        <div className="timeline-meta">
                          <span>📅 Event: {formatDate(record.date)}</span>
                          <span>🕐 Marked: {formatDateTime(record.marked_at)}</span>
                        </div>
                        {index === 1 && filteredRecords.length >= 2 && (
                          <div className="timeline-alert">
                            ⚠️ Critical threshold reached - Auto-block triggered
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {criticalParticipants.length > 0 && (
        <div className="alert alert-warning" style={{ marginTop: '30px' }}>
          <strong>⚠️ Auto-Block Alert:</strong> {criticalParticipants.length} participant(s)
          with 2 or more no-shows have been automatically added to the blocklist.
          {criticalParticipants.filter(p => p.is_blocklisted).length > 0 && (
            <p style={{ marginTop: '8px' }}>
              ✅ {criticalParticipants.filter(p => p.is_blocklisted).length} of {criticalParticipants.length} are now blocklisted.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
