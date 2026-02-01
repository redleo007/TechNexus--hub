import { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { participantsAPI, attendanceAPI, eventsAPI } from '../api/client';
import { useAsync } from '../utils/hooks';
import './ImportDataStyles.css';

interface ParsedParticipant {
  name: string;
  email?: string;
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
  const [activeTab, setActiveTab] = useState<'participants' | 'attendance' | 'delete'>('participants');

  useEffect(() => {
    document.title = 'Import Data - TechNexus Community';
  }, []);

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

  // Delete state
  const [selectedEventDelete, setSelectedEventDelete] = useState<string>('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'participant' | 'attendance' | null;
  }>({
    isOpen: false,
    type: null,
  });
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastDeleteUndo, setLastDeleteUndo] = useState<{ type: 'participant' | 'attendance'; token: string } | null>(null);

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

      // Match name/Name/Full Name/full_name columns (but not event_name)
      if ((normalizedKey.includes('name') || normalizedKey === 'full_name') && !normalizedKey.includes('event')) {
        mappedRow.name = row[key];
        // Match email/Email/E-mail/e_mail columns
      } else if (normalizedKey.includes('email') || normalizedKey === 'e-mail' || normalizedKey === 'e_mail') {
        mappedRow.email = row[key];
        // Match Event Pass/event_pass/eventpass/pass/code columns
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
  const normalizeStatus = (status?: string): 'attended' | 'no_show' => {
    if (!status) return 'no_show';

    const normalized = status.toLowerCase().trim();

    if (normalized === 'attended' || normalized === 'yes') {
      return 'attended';
    } else if (normalized === 'not attended' || normalized === 'no' || normalized === 'not_attended') {
      return 'no_show';
    }

    return 'no_show';
  };

  const getStatusBadgeColor = (status: 'attended' | 'no_show'): string => {
    switch (status) {
      case 'attended':
        return 'status-attended';
      case 'no_show':
        return 'status-no-show';
    }
  };

  const getStatusLabel = (status: 'attended' | 'no_show'): string => {
    switch (status) {
      case 'attended':
        return 'Attended';
      case 'no_show':
        return 'No-Show';
    }
  };

  // Participant file handler - supports CSV and Excel
  const handleParticipantFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    // Validate file type
    if (fileName.endsWith('.csv')) {
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
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const bstr = event.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          const mappedData = (data as any[]).map(mapParticipantColumns);
          setParticipantFileData(mappedData);
          setParticipantMessage(null);
        } catch (error) {
          setParticipantMessage({ type: 'error', text: 'Failed to parse Excel file' });
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setParticipantMessage({ type: 'error', text: 'Please upload a CSV or Excel file (.csv, .xlsx, .xls)' });
    }
  };

  // Attendance file handler - supports CSV and Excel
  const handleAttendanceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    // Validate file type
    if (fileName.endsWith('.csv')) {
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
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const bstr = event.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          const mappedData = (data as any[]).map(mapAttendanceColumns);
          setAttendanceFileData(mappedData);
          setAttendanceMessage(null);
        } catch (error) {
          setAttendanceMessage({ type: 'error', text: 'Failed to parse Excel file' });
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setAttendanceMessage({ type: 'error', text: 'Please upload a CSV or Excel file (.csv, .xlsx, .xls)' });
    }
  };

  // Participant validation
  const isValidParticipantRow = (row: ParsedParticipant): boolean => {
    return Boolean(row.name && row.name.trim());
  };

  // Attendance validation
  const isValidAttendanceRow = (row: ParsedAttendance): boolean => {
    const hasValidName = !!(row.name && row.name.trim());
    const hasValidEmail = !!(row.email && row.email.trim() && row.email.includes('@'));
    return hasValidName && hasValidEmail;
  };

  // Handle delete all participants
  const handleDeleteAllParticipants = () => {
    if (!selectedEventDelete) {
      setDeleteMessage({ type: 'error', text: 'Please select an event first.' });
      return;
    }
    setDeleteConfirmation({
      isOpen: true,
      type: 'participant',
    });
  };

  // Handle delete all attendance
  const handleDeleteAllAttendance = () => {
    if (!selectedEventDelete) {
      setDeleteMessage({ type: 'error', text: 'Please select an event first.' });
      return;
    }
    setDeleteConfirmation({
      isOpen: true,
      type: 'attendance',
    });
  };

  // Perform delete
  const performDelete = async () => {
    if (!deleteConfirmation.type || !selectedEventDelete) return;

    try {
      let result: { deleted: number; undoToken?: string };

      if (deleteConfirmation.type === 'participant') {
        result = await eventsAPI.deleteAllParticipants(selectedEventDelete).then(res => res.data);
        setDeleteMessage({
          type: 'success',
          text: `Successfully deleted ${result.deleted} participant(s) and their attendance records.`,
        });
        if (result.undoToken) {
          setLastDeleteUndo({ type: 'participant', token: result.undoToken });
        } else {
          setLastDeleteUndo(null);
        }
      } else if (deleteConfirmation.type === 'attendance') {
        result = await eventsAPI.deleteAllAttendance(selectedEventDelete).then(res => res.data);
        setDeleteMessage({
          type: 'success',
          text: `Successfully deleted ${result.deleted} attendance record(s).`,
        });
        if (result.undoToken) {
          setLastDeleteUndo({ type: 'attendance', token: result.undoToken });
        } else {
          setLastDeleteUndo(null);
        }
      }

      setDeleteConfirmation({
        isOpen: false,
        type: null,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setDeleteMessage({
        type: 'error',
        text: `Failed to delete: ${errorMsg}`,
      });
      setDeleteConfirmation({
        isOpen: false,
        type: null,
      });
    }
  };

  // Undo handler (one-time per delete, disabled on refresh)
  const handleUndoDelete = async () => {
    if (!lastDeleteUndo || !selectedEventDelete) return;
    try {
      const result = await eventsAPI.undoDelete(selectedEventDelete, lastDeleteUndo.type, lastDeleteUndo.token).then(res => res.data);
      setDeleteMessage({ type: 'success', text: `Undo successful. Restored ${result.restored} record(s).` });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setDeleteMessage({ type: 'error', text: `Failed to undo: ${errorMsg}` });
    } finally {
      // Disable further undo after one attempt
      setLastDeleteUndo(null);
    }
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
      // Send all participants in one bulk request with fallback
      const payload = {
        participants: participantFileData.map(row => ({
          full_name: row.name.trim(),
          email: row.email?.trim() || undefined,
          event_pass: row.eventPass?.trim() || undefined,
          event_id: selectedEventParticipants,
        })),
      };

      try {
        await participantsAPI.bulkCreateWithEventBatch(payload);
      } catch (primaryError) {
        // Some deployments only expose /participants/bulk-import
        await participantsAPI.bulkCreateWithEvent(payload);
        void primaryError;
      }

      // Session ID is captured by the import_sessions table for history tracking

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
      // Send all attendance records in one bulk request, with a graceful fallback
      const payload = {
        records: attendanceFileData.map(row => ({
          name: row.name.trim(),
          email: row.email.trim(),
          event_id: selectedEventAttendance,
          attendance_status: normalizeStatus(row.status),
        })),
      };

      let response;
      try {
        response = await attendanceAPI.bulkImportBatch(payload);
      } catch (primaryError: any) {
        try {
          // Some deployments expose only /attendance/bulk-import
          response = await attendanceAPI.bulkImport(payload);
        } catch (secondaryError: any) {
          // If both bulk endpoints are missing, fall back to per-record marking
          const primaryMsg = primaryError?.message || '';
          const secondaryMsg = secondaryError?.message || '';
          const isNotFound = primaryMsg.includes('404') && secondaryMsg.includes('404');

          if (!isNotFound) {
            throw secondaryError || primaryError;
          }

          // Fallback path: resolve participants for the event, then mark individually
          const participantsRes = await eventsAPI.getParticipants(selectedEventAttendance);
          const participants = Array.isArray(participantsRes?.data) ? participantsRes.data : Array.isArray(participantsRes) ? participantsRes : [];

          const emailToId = new Map<string, string>();
          participants.forEach((p: any) => {
            if (p?.email && p?.id) {
              emailToId.set(String(p.email).toLowerCase().trim(), p.id);
            }
          });

          const missingEmails: string[] = [];
          for (const row of attendanceFileData) {
            const email = row.email.trim().toLowerCase();
            const participantId = emailToId.get(email);
            if (!participantId) {
              missingEmails.push(row.email);
              continue;
            }

            const status = normalizeStatus(row.status) === 'attended' ? 'attended' : 'not_attended';
            await attendanceAPI.mark({
              event_id: selectedEventAttendance,
              participant_id: participantId,
              status,
            });
          }

          if (missingEmails.length > 0) {
            throw new Error(`Some attendees were not found for this event: ${missingEmails.slice(0, 5).join(', ')}${missingEmails.length > 5 ? '...' : ''}`);
          }

          response = { data: { fallback: true } } as any;
        }
        void primaryError; // silence unused variable
      }
      // Suppress unused variable warning - response may contain session data
      void response;

      // Session ID is captured by the import_sessions table for history tracking

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
    <div className="data-importer-page">
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
          <button
            className={`tab-button ${activeTab === 'delete' ? 'active' : ''}`}
            onClick={() => setActiveTab('delete')}
          >
            Delete Data
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
                <p className="section-desc">Upload a CSV file with columns: Name/Full Name (required), Email (optional), Event Pass (optional). Event selection is mandatory.</p>
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
                accept=".csv,.xlsx,.xls"
                onChange={handleParticipantFileSelect}
                id="csv-file-participants"
              />
              <label htmlFor="csv-file-participants" className="file-label">
                Click to select CSV or Excel file
              </label>
              {participantFileData.length > 0 && (
                <div className="file-info">
                  <span><Icon name="check" alt="File loaded" sizePx={16} /> File loaded: {participantFileData.length} rows</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setParticipantFileData([])}
                  >
                    <Icon name="delete" alt="Delete file" sizePx={16} /> Delete File
                  </button>
                </div>
              )}
            </div>

            {participantFileData.length > 0 && (
              <>
                <div className="data-preview-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Preview ({participantFileData.length} rows)</h3>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setParticipantFileData([])}
                      title="Delete and remove this file from preview"
                    >
                      <Icon name="delete" alt="Delete preview" sizePx={16} /> Delete Preview
                    </button>
                  </div>
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Full Name</th>
                          <th>Email</th>
                          <th>Event Pass</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participantFileData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className={isValidParticipantRow(row) ? 'row-valid' : 'row-invalid'}>
                            <td>{row.name}</td>
                            <td>{row.email || '-'}</td>
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

                <div className="page-actions">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleImportParticipants}
                    disabled={importingParticipants}
                  >
                    {importingParticipants ? <><Icon name="loader" alt="Importing" sizePx={16} spin /> Importing...</> : <><Icon name="success" alt="Import" sizePx={16} /> Import Participants</>}
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
                accept=".csv,.xlsx,.xls"
                onChange={handleAttendanceFileSelect}
                id="csv-file-attendance"
              />
              <label htmlFor="csv-file-attendance" className="file-label">
                Click to select CSV or Excel file
              </label>
              {attendanceFileData.length > 0 && (
                <div className="file-info">
                  <span><Icon name="check" alt="File loaded" sizePx={16} /> File loaded: {attendanceFileData.length} rows</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setAttendanceFileData([])}
                  >
                    <Icon name="delete" alt="Delete file" sizePx={16} /> Delete File
                  </button>
                </div>
              )}
            </div>

            {attendanceFileData.length > 0 && (
              <>
                <div className="data-preview-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Preview ({attendanceFileData.length} rows)</h3>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setAttendanceFileData([])}
                      title="Delete and remove this file from preview"
                    >
                      <Icon name="delete" alt="Delete preview" sizePx={16} /> Delete Preview
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

                <div className="page-actions">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleImportAttendance}
                    disabled={importingAttendance}
                  >
                    {importingAttendance ? <><Icon name="loader" alt="Importing" sizePx={16} spin /> Importing...</> : <><Icon name="success" alt="Import attendance" sizePx={16} /> Import Attendance</>}
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

      {/* Delete Tab */}
      {activeTab === 'delete' && (
        <div className="tab-content card">
          {deleteMessage && (
            <div className={`alert alert-${deleteMessage.type}`}>
              {deleteMessage.text}
              {lastDeleteUndo && deleteMessage.type === 'success' && (
                <span style={{ marginLeft: '12px' }}>
                  <button className="btn btn-outline-warning btn-sm" onClick={handleUndoDelete}>
                    Undo Last Delete
                  </button>
                </span>
              )}
            </div>
          )}

          <div className="section-header">
            <div>
              <h2>Delete All Data for Event</h2>
              <p className="section-desc">Permanently delete all participants or attendance records for a selected event. This action cannot be undone.</p>
            </div>
          </div>

          {/* Event Selector */}
          <div className="form-group">
            <label htmlFor="delete-event-select">Select Event *</label>
            <select
              id="delete-event-select"
              value={selectedEventDelete}
              onChange={(e) => setSelectedEventDelete(e.target.value)}
            >
              <option value="">-- Choose an event --</option>
              {events?.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} ({new Date(event.date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Delete Actions */}
          <div className="delete-actions" style={{ display: 'flex', gap: '16px', marginTop: '30px' }}>
            <button
              className="btn btn-danger btn-lg"
              onClick={handleDeleteAllParticipants}
              disabled={!selectedEventDelete}
              style={{ flex: 1 }}
            >
              <Icon name="delete" alt="Delete participants" sizePx={18} /> Delete All Participants
            </button>
            <button
              className="btn btn-danger btn-lg"
              onClick={handleDeleteAllAttendance}
              disabled={!selectedEventDelete}
              style={{ flex: 1 }}
            >
              <Icon name="delete" alt="Delete attendance" sizePx={18} /> Delete All Attendance
            </button>
          </div>

          <div className="alert alert-warning" style={{ marginTop: '30px' }}>
            <Icon name="warning" alt="Warning" sizePx={16} />
            <strong>Warning:</strong> Deleting participants will also remove all their attendance records. Deleting attendance will only remove attendance data.
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Confirm Delete All</h2>
            </div>
            <div className="modal-body">
              <p className="warning-message">
                <Icon name="warning" alt="Warning" sizePx={16} />
                You are about to permanently delete ALL {deleteConfirmation.type === 'participant' ? 'participants' : 'attendance records'} for this event.
                {deleteConfirmation.type === 'participant' && ' This will also delete all associated attendance records.'}
                <br /><br />
                <strong>This action cannot be undone.</strong>
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setDeleteConfirmation({
                  isOpen: false,
                  type: null,
                })}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-delete"
                onClick={performDelete}
              >
                Delete All {deleteConfirmation.type === 'participant' ? 'Participants' : 'Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

