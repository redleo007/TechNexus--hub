import { useState } from 'react';
import Papa from 'papaparse';
import { participantsAPI, attendanceAPI, eventsAPI } from '../api/client';
import { useAsync } from '../utils/hooks';
import './ImportAttendance.css';

interface ParsedParticipant {
  name: string;
  eventPass?: string;
}

interface ParsedAttendance {
  name: string;
  email: string;
  status?: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
}

export function ImportAttendance() {
  const [activeTab, setActiveTab] = useState<'participants' | 'attendance'>('participants');
  
  // Participants import state
  const [selectedEventParticipants, setSelectedEventParticipants] = useState<string>('');
  const [participantFileData, setParticipantFileData] = useState<ParsedParticipant[]>([]);
  const [participantMessage, setParticipantMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importingParticipants, setImportingParticipants] = useState(false);

  // Attendance import state
  const [selectedEventAttendance, setSelectedEventAttendance] = useState<string>('');
  const [attendanceFileData, setAttendanceFileData] = useState<ParsedAttendance[]>([]);
  const [attendanceMessage, setAttendanceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importingAttendance, setImportingAttendance] = useState(false);

  const { data: events } = useAsync<Event[]>(
    () => eventsAPI.getAll().then((res) => res.data),
    true
  );

  const normalizeColumnName = (col: string): string => {
    return col.toLowerCase().trim().replace(/\s+/g, '_');
  };

  // Map CSV columns to participant data
  const mapParticipantColumns = (row: any): ParsedParticipant => {
    const mappedRow: any = {};
    
    for (const key in row) {
      const normalizedKey = normalizeColumnName(key);
      
      if (normalizedKey.includes('name') && !normalizedKey.includes('event')) {
        mappedRow.name = row[key];
      } else if (normalizedKey.includes('pass') || normalizedKey.includes('code') || normalizedKey.includes('event_pass') || normalizedKey.includes('eventpass')) {
        mappedRow.eventPass = row[key];
      }
    }
    
    return mappedRow;
  };

  // Map CSV columns to attendance data
  const mapAttendanceColumns = (row: any): ParsedAttendance => {
    const mappedRow: any = {};
    
    for (const key in row) {
      const normalizedKey = normalizeColumnName(key);
      
      if (normalizedKey.includes('name') && !normalizedKey.includes('event')) {
        mappedRow.name = row[key];
      } else if (normalizedKey.includes('email')) {
        mappedRow.email = row[key];
      } else if (normalizedKey.includes('status')) {
        mappedRow.status = row[key];
      }
    }
    
    return mappedRow;
  };

  // Normalize status values
  const normalizeStatus = (status?: string): 'attended' | 'not_attended' | 'no_show' => {
    if (!status) return 'no_show';
    
    const normalized = status.toLowerCase().trim();
    
    if (normalized === 'attended' || normalized === 'yes') {
      return 'attended';
    } else if (normalized === 'not attended' || normalized === 'no' || normalized === 'not_attended') {
      return 'not_attended';
    }
    
    return 'no_show';
  };

  const getStatusBadgeColor = (status: 'attended' | 'not_attended' | 'no_show'): string => {
    switch (status) {
      case 'attended':
        return 'status-attended';
      case 'not_attended':
        return 'status-not-attended';
      case 'no_show':
        return 'status-no-show';
    }
  };

  const getStatusLabel = (status: 'attended' | 'not_attended' | 'no_show'): string => {
    switch (status) {
      case 'attended':
        return 'Attended';
      case 'not_attended':
        return 'Not Attended';
      case 'no_show':
        return 'No-Show';
    }
  };

  // Participant file handler
  const handleParticipantFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mappedData = (results.data as any[]).map(mapParticipantColumns);
        setParticipantFileData(mappedData);
        setParticipantMessage(null);
      },
      error: (error) => {
        setParticipantMessage({ type: 'error', text: `CSV parsing error: ${error.message || 'Unknown error'}` });
      },
    });
  };

  // Attendance file handler
  const handleAttendanceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mappedData = (results.data as any[]).map(mapAttendanceColumns);
        setAttendanceFileData(mappedData);
        setAttendanceMessage(null);
      },
      error: (error) => {
        setAttendanceMessage({ type: 'error', text: `CSV parsing error: ${error.message || 'Unknown error'}` });
      },
    });
  };

  // Participant validation
  const isValidParticipantRow = (row: ParsedParticipant): boolean => {
    return Boolean(row.name && row.name.trim());
  };

  // Attendance validation
  const isValidAttendanceRow = (row: ParsedAttendance): boolean => {
    const hasValidName = row.name && row.name.trim();
    const hasValidEmail = row.email && row.email.trim() && row.email.includes('@');
    return hasValidName && hasValidEmail;
  };

  // Import participants
  const handleImportParticipants = async () => {
    if (participantFileData.length === 0) {
      setParticipantMessage({ type: 'error', text: 'No data to import. Please select a CSV file.' });
      return;
    }

    if (!selectedEventParticipants) {
      setParticipantMessage({ type: 'error', text: 'Please select an event before importing participants.' });
      return;
    }

    const invalidRows = participantFileData.filter((row) => !isValidParticipantRow(row));
    if (invalidRows.length > 0) {
      setParticipantMessage({
        type: 'error',
        text: `Cannot import: ${invalidRows.length} rows have missing or empty names.`,
      });
      return;
    }

    setImportingParticipants(true);
    
    try {
      // Send all participants in one bulk request
      const result = await participantsAPI.bulkCreateWithEventBatch({
        participants: participantFileData.map(row => ({
          full_name: row.name.trim(),
          event_id: selectedEventParticipants,
        })),
      });

      setParticipantMessage({
        type: 'success',
        text: `Import completed successfully! ${participantFileData.length} participants imported.`,
      });

      setParticipantFileData([]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setParticipantMessage({
        type: 'error',
        text: `Import failed: ${errorMsg}`,
      });
    } finally {
      setImportingParticipants(false);
    }
  };

  // Import attendance
  const handleImportAttendance = async () => {
    if (attendanceFileData.length === 0) {
      setAttendanceMessage({ type: 'error', text: 'No data to import. Please select a CSV file.' });
      return;
    }

    if (!selectedEventAttendance) {
      setAttendanceMessage({ type: 'error', text: 'Please select an event before importing attendance.' });
      return;
    }

    const invalidRows = attendanceFileData.filter((row) => !isValidAttendanceRow(row));
    if (invalidRows.length > 0) {
      const missingFields = invalidRows.map(row => {
        const issues = [];
        if (!row.name || !row.name.trim()) issues.push('missing name');
        if (!row.email || !row.email.trim()) issues.push('missing email');
        if (row.email && !row.email.includes('@')) issues.push('invalid email format');
        return `"${row.name || 'N/A'}" - ${issues.join(', ')}`;
      });
      setAttendanceMessage({
        type: 'error',
        text: `Cannot import: ${invalidRows.length} rows are invalid:\n${missingFields.slice(0, 3).join('\n')}${invalidRows.length > 3 ? `\n... and ${invalidRows.length - 3} more` : ''}`,
      });
      return;
    }

    setImportingAttendance(true);

    try {
      // Send all attendance records in one bulk request
      const result = await attendanceAPI.bulkImportBatch({
        records: attendanceFileData.map(row => ({
          name: row.name.trim(),
          email: row.email.trim(),
          event_id: selectedEventAttendance,
          attendance_status: normalizeStatus(row.status),
        })),
      });

      setAttendanceMessage({
        type: 'success',
        text: `Import completed successfully! ${attendanceFileData.length} attendance records imported.`,
      });

      setAttendanceFileData([]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setAttendanceMessage({
        type: 'error',
        text: `Import failed: ${errorMsg}`,
      });
    } finally {
      setImportingAttendance(false);
    }
  };

  return (
    <div className="import-attendance">
      <div className="page-header">
        <h1>Import Data</h1>
        <p>Bulk import participants and attendance records</p>
      </div>

      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            Import Participants
          </button>
          <button
            className={`tab-button ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            Import Attendance
          </button>
        </div>
      </div>

      {/* Participants Tab */}
      {activeTab === 'participants' && (
        <div className="tab-content card">
          {participantMessage && (
            <div className={`alert alert-${participantMessage.type}`}>
              {participantMessage.text}
            </div>
          )}

          <div className="import-section">
            <div className="section-header">
              <div>
                <h2>Import Participants from CSV</h2>
                <p className="section-desc">Upload a CSV file with column: full name (required). Event selection is mandatory.</p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="event-select-participants">Select Event *</label>
              <select
                id="event-select-participants"
                value={selectedEventParticipants}
                onChange={(e) => setSelectedEventParticipants(e.target.value)}
              >
                <option value="">-- Choose an event --</option>
                {events?.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({new Date(event.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="file-upload">
              <input
                type="file"
                accept=".csv"
                onChange={handleParticipantFileSelect}
                id="csv-file-participants"
              />
              <label htmlFor="csv-file-participants" className="file-label">
                📄 Click to select CSV file
              </label>
              {participantFileData.length > 0 && (
                <div className="file-info">
                  <span>✓ File loaded: {participantFileData.length} rows</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setParticipantFileData([])}
                  >
                    🗑️ Delete File
                  </button>
                </div>
              )}
            </div>

            {participantFileData.length > 0 && (
              <>
                <div className="preview-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Preview ({participantFileData.length} rows)</h3>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setParticipantFileData([])}
                      title="Delete and remove this file from preview"
                    >
                      🗑️ Delete Preview
                    </button>
                  </div>
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Full Name</th>
                          <th>Event Pass</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participantFileData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className={isValidParticipantRow(row) ? 'row-valid' : 'row-invalid'}>
                            <td>{row.name}</td>
                            <td>{row.eventPass || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {participantFileData.length > 5 && (
                    <p className="text-muted">... and {participantFileData.length - 5} more rows</p>
                  )}
                </div>

                <div className="import-actions">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleImportParticipants}
                    disabled={importingParticipants}
                  >
                    {importingParticipants ? '⏳ Importing...' : '✅ Import Participants'}
                  </button>
                  <button
                    className="btn btn-secondary btn-lg"
                    onClick={() => setParticipantFileData([])}
                    disabled={importingParticipants}
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="tab-content card">
          {attendanceMessage && (
            <div className={`alert alert-${attendanceMessage.type}`}>
              {attendanceMessage.text}
            </div>
          )}

          <div className="import-section">
            <div className="section-header">
              <div>
                <h2>Import Attendance Records from CSV</h2>
                <p className="section-desc">Upload a CSV file with columns: name (required), email (required), status (optional). Status can be "attended", "not attended", or left empty for no-show.</p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="event-select-attendance">Select Event *</label>
              <select
                id="event-select-attendance"
                value={selectedEventAttendance}
                onChange={(e) => setSelectedEventAttendance(e.target.value)}
              >
                <option value="">-- Choose an event --</option>
                {events?.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({new Date(event.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="file-upload">
              <input
                type="file"
                accept=".csv"
                onChange={handleAttendanceFileSelect}
                id="csv-file-attendance"
              />
              <label htmlFor="csv-file-attendance" className="file-label">
                📄 Click to select CSV file
              </label>
              {attendanceFileData.length > 0 && (
                <div className="file-info">
                  <span>✓ File loaded: {attendanceFileData.length} rows</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setAttendanceFileData([])}
                  >
                    🗑️ Delete File
                  </button>
                </div>
              )}
            </div>

            {attendanceFileData.length > 0 && (
              <>
                <div className="preview-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Preview ({attendanceFileData.length} rows)</h3>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setAttendanceFileData([])}
                      title="Delete and remove this file from preview"
                    >
                      🗑️ Delete Preview
                    </button>
                  </div>
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Attendance Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceFileData.slice(0, 5).map((row, idx) => {
                          const status = normalizeStatus(row.status);
                          const isValid = isValidAttendanceRow(row);
                          return (
                            <tr key={idx} className={isValid ? 'row-valid' : 'row-invalid'}>
                              <td>{row.name}</td>
                              <td>{row.email}</td>
                              <td>
                                <span className={`badge ${getStatusBadgeColor(status)}`}>
                                  {getStatusLabel(status)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {attendanceFileData.length > 5 && (
                    <p className="text-muted">... and {attendanceFileData.length - 5} more rows</p>
                  )}
                </div>

                <div className="import-actions">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleImportAttendance}
                    disabled={importingAttendance}
                  >
                    {importingAttendance ? '⏳ Importing...' : '✅ Import Attendance'}
                  </button>
                  <button
                    className="btn btn-secondary btn-lg"
                    onClick={() => setAttendanceFileData([])}
                    disabled={importingAttendance}
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

