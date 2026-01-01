import { useState } from 'react';
import Papa from 'papaparse';
import { participantsAPI, attendanceAPI, eventsAPI } from '../api/client';
import { useAsync } from '../utils/hooks';
import './ImportAttendance.css';

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

export function ImportAttendance() {
  const [activeTab, setActiveTab] = useState<'import-participants' | 'import-attendance'>('import-participants');
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [fileData, setFileData] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importing, setImporting] = useState(false);

  const { data: events } = useAsync<Event[]>(
    () => eventsAPI.getAll().then((res) => res.data),
    true
  );

  const { data: participants, refetch: refetchParticipants } = useAsync<Participant[]>(
    () => participantsAPI.getAll(true).then((res) => res.data),
    true
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setFileData(results.data as any[]);
        setMessage(null);
      },
      error: (error) => {
        setMessage({ type: 'error', text: `CSV parsing error: ${error.message || 'Unknown error'}` });
      },
    });
  };

  const validateParticipantData = (row: any): boolean => {
    return row.name && row.email;
  };

  const validateAttendanceData = (row: any): boolean => {
    return row.email && (row.status === 'attended' || row.status === 'no_show');
  };

  const handleImportParticipants = async () => {
    if (fileData.length === 0) {
      setMessage({ type: 'error', text: 'No data to import' });
      return;
    }

    const invalid = fileData.filter((row) => !validateParticipantData(row));
    if (invalid.length > 0) {
      setMessage({
        type: 'error',
        text: `${invalid.length} rows have invalid data. Required: name, email`,
      });
      return;
    }

    setImporting(true);
    let successful = 0;
    let failed = 0;

    for (const row of fileData) {
      try {
        await participantsAPI.create({
          name: row.name.trim(),
          email: row.email.trim(),
          phone: row.phone?.trim() || undefined,
          is_blocklisted: false,
        });
        successful++;
      } catch {
        failed++;
      }
    }

    setImporting(false);
    setMessage({
      type: failed === 0 ? 'success' : 'error',
      text: `Import completed: ${successful} successful, ${failed} failed`,
    });

    if (successful > 0) {
      setFileData([]);
      refetchParticipants();
      setTimeout(() => setFileData([]), 1500);
    }
  };

  const handleImportAttendance = async () => {
    if (!selectedEvent) {
      setMessage({ type: 'error', text: 'Please select an event' });
      return;
    }

    if (fileData.length === 0) {
      setMessage({ type: 'error', text: 'No data to import' });
      return;
    }

    const invalid = fileData.filter((row) => !validateAttendanceData(row));
    if (invalid.length > 0) {
      setMessage({
        type: 'error',
        text: `${invalid.length} rows have invalid data. Required: email, status (attended/no_show)`,
      });
      return;
    }

    setImporting(true);
    let successful = 0;
    let failed = 0;

    for (const row of fileData) {
      try {
        const participant = participants?.find(
          (p) => p.email.toLowerCase() === row.email.toLowerCase()
        );

        if (!participant) {
          failed++;
          continue;
        }

        if (participant.is_blocklisted) {
          failed++;
          continue;
        }

        await attendanceAPI.mark({
          event_id: selectedEvent,
          participant_id: participant.id,
          status: row.status.toLowerCase() === 'attended' ? 'attended' : 'no_show',
        });
        successful++;
      } catch {
        failed++;
      }
    }

    setImporting(false);
    setMessage({
      type: failed === 0 ? 'success' : 'error',
      text: `Import completed: ${successful} successful, ${failed} failed/blocklisted`,
    });

    if (successful > 0) {
      setFileData([]);
      setTimeout(() => setFileData([]), 1500);
    }
  };

  const getStatusColor = (status: string): string => {
    return status.toLowerCase() === 'attended' ? 'badge-success' : 'badge-danger';
  };

  const convertToCSV = (data: any[], headers: string[]): string => {
    const csvHeaders = headers.join(',');
    const csvRows = data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value || '').replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      }).join(',')
    );
    return [csvHeaders, ...csvRows].join('\n');
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportParticipants = () => {
    if (!participants || participants.length === 0) {
      setMessage({ type: 'error', text: 'No participants to export' });
      return;
    }

    const data = participants.map((p) => ({
      name: p.name,
      email: p.email,
      is_blocklisted: p.is_blocklisted ? 'yes' : 'no',
    }));

    const csv = convertToCSV(data, ['name', 'email', 'is_blocklisted']);
    downloadCSV(csv, `participants_${new Date().toISOString().split('T')[0]}.csv`);
    setMessage({ type: 'success', text: 'Participants exported successfully' });
  };

  const handleExportAttendance = async () => {
    if (!selectedEvent) {
      setMessage({ type: 'error', text: 'Please select an event first' });
      return;
    }

    try {
      const attendance = await attendanceAPI.getByEvent(selectedEvent).then((res) => res.data);
      
      if (!attendance || attendance.length === 0) {
        setMessage({ type: 'error', text: 'No attendance records for this event' });
        return;
      }

      const event = events?.find((e) => e.id === selectedEvent);
      const data = attendance.map((record: any) => ({
        email: record.participant_email || record.email,
        status: record.status,
        event: event?.name || 'Unknown',
        date: event?.date ? new Date(event.date).toLocaleDateString() : 'Unknown',
      }));

      const csv = convertToCSV(data, ['email', 'status', 'event', 'date']);
      downloadCSV(csv, `attendance_${event?.name || 'export'}_${new Date().toISOString().split('T')[0]}.csv`);
      setMessage({ type: 'success', text: 'Attendance records exported successfully' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to export attendance',
      });
    }
  };

  return (
    <div className="import-attendance">
      <div className="page-header">
        <h1>Import & Attendance Management</h1>
        <p>Bulk import participants and manage attendance records</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'import-participants' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('import-participants');
            setFileData([]);
          }}
        >
          📥 Import Participants
        </button>
        <button
          className={`tab-btn ${activeTab === 'import-attendance' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('import-attendance');
            setFileData([]);
          }}
        >
          ✅ Import Attendance
        </button>
      </div>

      <div className="tab-content card">
        {activeTab === 'import-participants' && (
          <div className="import-section">
            <div className="section-header">
              <div>
                <h2>Import Participants from CSV</h2>
                <p className="section-desc">Upload a CSV file with columns: name, email, phone (optional)</p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleExportParticipants}
                title="Export all participants to CSV"
              >
                📥 Export Participants
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="event-select-participants">Select Event (Optional)</label>
              <select
                id="event-select-participants"
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
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
                onChange={handleFileSelect}
                id="csv-file"
              />
              <label htmlFor="csv-file" className="file-label">
                📄 Click to select CSV file
              </label>
            </div>

            {fileData.length > 0 && (
              <>
                <div className="preview-section">
                  <h3>Preview ({fileData.length} rows)</h3>
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fileData.slice(0, 5).map((row, idx) => (
                          <tr key={idx}>
                            <td>{row.name}</td>
                            <td>{row.email}</td>
                            <td>{row.phone || '-'}</td>
                            <td>
                              <span
                                className={`badge ${validateParticipantData(row) ? 'badge-success' : 'badge-danger'}`}
                              >
                                {validateParticipantData(row) ? '✓ Valid' : '✗ Invalid'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {fileData.length > 5 && (
                    <p className="text-muted">... and {fileData.length - 5} more rows</p>
                  )}
                </div>

                <div className="import-actions">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleImportParticipants}
                    disabled={importing}
                  >
                    {importing ? '⏳ Importing...' : '✅ Import Participants'}
                  </button>
                  <button
                    className="btn btn-secondary btn-lg"
                    onClick={() => setFileData([])}
                    disabled={importing}
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'import-attendance' && (
          <div className="import-section">
            <div className="section-header">
              <div>
                <h2>Import Attendance from CSV</h2>
                <p className="section-desc">Upload a CSV file with columns: email, status (attended/no_show)</p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleExportAttendance}
                disabled={!selectedEvent}
                title="Export attendance records to CSV"
              >
                📥 Export Attendance
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="event-select">Select Event *</label>
              <select
                id="event-select"
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
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
                onChange={handleFileSelect}
                id="attendance-csv"
              />
              <label htmlFor="attendance-csv" className="file-label">
                📄 Click to select CSV file
              </label>
            </div>

            {fileData.length > 0 && (
              <>
                <div className="preview-section">
                  <h3>Preview ({fileData.length} rows)</h3>
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Participant Found</th>
                          <th>Validation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fileData.slice(0, 5).map((row, idx) => {
                          const participant = participants?.find(
                            (p) => p.email.toLowerCase() === row.email.toLowerCase()
                          );
                          const isValid = validateAttendanceData(row);

                          return (
                            <tr key={idx}>
                              <td>{row.email}</td>
                              <td>
                                <span className={`badge ${getStatusColor(row.status)}`}>
                                  {row.status}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    participant ? 'badge-success' : 'badge-danger'
                                  }`}
                                >
                                  {participant ? '✓' : '✗'}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`badge ${isValid && participant && !participant.is_blocklisted ? 'badge-success' : 'badge-danger'}`}
                                >
                                  {isValid &&
                                  participant &&
                                  !participant.is_blocklisted
                                    ? '✓ Valid'
                                    : '✗ Invalid'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {fileData.length > 5 && (
                    <p className="text-muted">
                      ... and {fileData.length - 5} more rows
                    </p>
                  )}
                </div>

                <div className="import-actions">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleImportAttendance}
                    disabled={!selectedEvent || importing}
                  >
                    {importing ? '⏳ Importing...' : '✅ Import Attendance'}
                  </button>
                  <button
                    className="btn btn-secondary btn-lg"
                    onClick={() => setFileData([])}
                    disabled={importing}
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
