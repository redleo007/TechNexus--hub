import { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { participantsAPI, attendanceAPI, eventsAPI } from '../api/client';
import { useAsync } from '../utils/hooks';
// @ts-ignore
import styles from './ImportAttendance.module.css';

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
      default:
        return 'status-no-show';
    }
  };

  const getStatusLabel = (status: 'attended' | 'no_show'): string => {
    switch (status) {
      case 'attended':
        return 'Attended';
      case 'no_show':
        return 'No-Show';
      default:
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
      void response;

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
    <div className={styles['data-importer-container']}>
      <div className={styles['data-importer-header']}>
        <h1>Import Data</h1>
        <p>Bulk import participants and attendance records for your events.</p>
      </div>

      <div className={styles['data-importer-tabs-wrapper']}>
        <div className={styles['data-importer-tabs']}>
          <button
            className={`${styles['data-importer-tab-btn']} ${activeTab === 'participants' ? styles['active'] : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            <Icon name="users" alt="Participants" sizePx={16} />
            Import Participants
          </button>
          <button
            className={`${styles['data-importer-tab-btn']} ${activeTab === 'attendance' ? styles['active'] : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <Icon name="check" alt="Attendance" sizePx={16} />
            Import Attendance
          </button>
          <button
            className={`${styles['data-importer-tab-btn']} ${activeTab === 'delete' ? styles['active'] : ''}`}
            onClick={() => setActiveTab('delete')}
          >
            <Icon name="delete" alt="Delete" sizePx={16} />
            Delete Data
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={styles['data-importer-card']}>

        {/* =========================================
            PARTICIPANTS TAB content
           ========================================= */}
        {activeTab === 'participants' && (
          <div className="data-importer-tab-content">
            {participantMessage && (
              <div className={`${styles['data-importer-alert']} ${styles[`data-importer-alert-${participantMessage.type}`]}`}>
                <Icon name={participantMessage.type === 'success' ? 'success' : 'warning'} alt="Status" sizePx={20} />
                <span>{participantMessage.text}</span>
              </div>
            )}

            <div className={styles['data-importer-section-head']}>
              <h2>Import Participants</h2>
              <p className={styles['data-importer-section-desc']}>
                Upload a CSV file containing <strong>Full Name</strong> (required), <strong>Email</strong>, and <strong>Event Pass</strong>.
              </p>
            </div>

            <div className={styles['data-importer-form-group']}>
              <label htmlFor="participants-event-select" className={styles['data-importer-label']}>Select Target Event</label>
              <select
                id="participants-event-select"
                className={styles['data-importer-select']}
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

            <div className={styles['data-importer-upload-zone']}>
              <input
                type="file"
                className={styles['data-importer-file-input']}
                accept=".csv,.xlsx,.xls"
                onChange={handleParticipantFileSelect}
                id="participant-file-upload"
              />
              <div className={styles['data-importer-drop-area']}>
                <div className={styles['data-importer-icon-upload']}></div>
                <div>
                  <strong>Click or Drag to Upload</strong>
                  <div style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.7 }}>
                    Supports .CSV, .XLSX, .XLS
                  </div>
                </div>
              </div>
            </div>

            {participantFileData.length > 0 && (
              <div className={styles['data-importer-file-status']}>
                <div className={styles['data-importer-file-name']}>
                  <Icon name="check" alt="Ready" sizePx={18} />
                  {participantFileData.length} rows loaded successfully
                </div>
                <button
                  className={styles['data-importer-delete-file-btn']}
                  onClick={() => setParticipantFileData([])}
                >
                  Remove File
                </button>
              </div>
            )}

            {participantFileData.length > 0 && (
              <div className={styles['data-importer-preview']}>
                <div className={styles['data-importer-preview-head']}>
                  <h3>Preview Data</h3>
                </div>
                <div className={styles['data-importer-table-scroll']}>
                  <table className={styles['data-importer-table']}>
                    <thead>
                      <tr>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Pass Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participantFileData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className={!isValidParticipantRow(row) ? styles['data-importer-row-invalid'] : ''}>
                          <td>{row.name}</td>
                          <td>{row.email || '-'}</td>
                          <td>{row.eventPass || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {participantFileData.length > 5 && (
                  <div style={{ padding: '12px 16px', color: '#8a8a9b', fontSize: '0.9rem' }}>
                    And {participantFileData.length - 5} more rows...
                  </div>
                )}
              </div>
            )}

            {participantFileData.length > 0 && (
              <div className={styles['data-importer-actions']}>
                <button
                  className={`${styles['data-importer-btn']} ${styles['data-importer-btn-primary']}`}
                  onClick={handleImportParticipants}
                  disabled={importingParticipants}
                  style={{ flex: 1 }}
                >
                  {importingParticipants ? 'Importing...' : 'Start Import'}
                </button>
                <button
                  className={`${styles['data-importer-btn']} ${styles['data-importer-btn-secondary']}`}
                  onClick={() => setParticipantFileData([])}
                  disabled={importingParticipants}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}


        {/* =========================================
            ATTENDANCE TAB content
           ========================================= */}
        {activeTab === 'attendance' && (
          <div className="data-importer-tab-content">
            {attendanceMessage && (
              <div className={`${styles['data-importer-alert']} ${styles[`data-importer-alert-${attendanceMessage.type}`]}`}>
                <Icon name={attendanceMessage.type === 'success' ? 'success' : 'warning'} alt="Status" sizePx={20} />
                <span>{attendanceMessage.text}</span>
              </div>
            )}

            <div className={styles['data-importer-section-head']}>
              <h2>Import Attendance</h2>
              <p className={styles['data-importer-section-desc']}>
                Upload a CSV with <strong>Name</strong> and <strong>Email</strong> to mark attendance. Status column is optional.
              </p>
            </div>

            <div className={styles['data-importer-form-group']}>
              <label htmlFor="attendance-event-select" className={styles['data-importer-label']}>Select Target Event</label>
              <select
                id="attendance-event-select"
                className={styles['data-importer-select']}
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

            <div className={styles['data-importer-upload-zone']}>
              <input
                type="file"
                className={styles['data-importer-file-input']}
                accept=".csv,.xlsx,.xls"
                onChange={handleAttendanceFileSelect}
                id="attendance-file-upload"
              />
              <div className={styles['data-importer-drop-area']}>
                <div className={styles['data-importer-icon-upload']}></div>
                <div>
                  <strong>Click or Drag to Upload</strong>
                  <div style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.7 }}>
                    Supports .CSV, .XLSX, .XLS
                  </div>
                </div>
              </div>
            </div>

            {attendanceFileData.length > 0 && (
              <div className={styles['data-importer-file-status']}>
                <div className={styles['data-importer-file-name']}>
                  <Icon name="check" alt="Ready" sizePx={18} />
                  {attendanceFileData.length} records loaded
                </div>
                <button
                  className={styles['data-importer-delete-file-btn']}
                  onClick={() => setAttendanceFileData([])}
                >
                  Remove File
                </button>
              </div>
            )}

            {attendanceFileData.length > 0 && (
              <div className={styles['data-importer-preview']}>
                <div className={styles['data-importer-preview-head']}>
                  <h3>Preview Data</h3>
                </div>
                <div className={styles['data-importer-table-scroll']}>
                  <table className={styles['data-importer-table']}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceFileData.slice(0, 5).map((row, idx) => {
                        const status = normalizeStatus(row.status);
                        return (
                          <tr key={idx} className={!isValidAttendanceRow(row) ? styles['data-importer-row-invalid'] : ''}>
                            <td>{row.name}</td>
                            <td>{row.email}</td>
                            <td>
                              <span className={styles[getStatusBadgeColor(status)] || getStatusBadgeColor(status)}>
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
                  <div style={{ padding: '12px 16px', color: '#8a8a9b', fontSize: '0.9rem' }}>
                    And {attendanceFileData.length - 5} more rows...
                  </div>
                )}
              </div>
            )}

            {attendanceFileData.length > 0 && (
              <div className={styles['data-importer-actions']}>
                <button
                  className={`${styles['data-importer-btn']} ${styles['data-importer-btn-primary']}`}
                  onClick={handleImportAttendance}
                  disabled={importingAttendance}
                  style={{ flex: 1 }}
                >
                  {importingAttendance ? 'Importing...' : 'Start Import'}
                </button>
                <button
                  className={`${styles['data-importer-btn']} ${styles['data-importer-btn-secondary']}`}
                  onClick={() => setAttendanceFileData([])}
                  disabled={importingAttendance}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}


        {/* =========================================
            DELETE TAB content
           ========================================= */}
        {activeTab === 'delete' && (
          <div className="data-importer-tab-content">
            {deleteMessage && (
              <div className={`${styles['data-importer-alert']} ${styles[`data-importer-alert-${deleteMessage.type}`]}`}>
                <Icon name={deleteMessage.type === 'success' ? 'success' : 'warning'} alt="Status" sizePx={20} />
                <span>{deleteMessage.text}</span>
                {lastDeleteUndo && deleteMessage.type === 'success' && (
                  <button
                    className={styles['data-importer-btn-secondary']}
                    onClick={handleUndoDelete}
                    style={{ marginLeft: 16, padding: '4px 12px', fontSize: '0.8rem', borderRadius: 4, cursor: 'pointer' }}
                  >
                    Undo
                  </button>
                )}
              </div>
            )}

            <div className={styles['data-importer-section-head']}>
              <h2>Data Management & Deletion</h2>
              <p className={styles['data-importer-section-desc']}>
                Permanently remove participants or attendance records from an event. <strong>This action is destructive.</strong>
              </p>
            </div>

            <div className={styles['data-importer-form-group']}>
              <label htmlFor="delete-event-select" className={styles['data-importer-label']}>Select Event for Deletion</label>
              <select
                id="delete-event-select"
                className={styles['data-importer-select']}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 40 }}>
              <div style={{ background: 'rgba(255, 71, 87, 0.05)', padding: 20, borderRadius: 10, border: '1px solid rgba(255, 71, 87, 0.1)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#ff4757' }}>Delete Participants</h3>
                <p style={{ fontSize: '0.9rem', color: '#a0a0b0', marginBottom: 20 }}>
                  Removes all registered participants AND their attendance records for the selected event.
                </p>
                <button
                  className={`${styles['data-importer-btn']} ${styles['data-importer-btn-danger']}`}
                  onClick={handleDeleteAllParticipants}
                  disabled={!selectedEventDelete}
                  style={{ width: '100%', padding: '12px' }}
                >
                  Delete Participants
                </button>
              </div>

              <div style={{ background: 'rgba(255, 71, 87, 0.05)', padding: 20, borderRadius: 10, border: '1px solid rgba(255, 71, 87, 0.1)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#ff4757' }}>Clear Attendance</h3>
                <p style={{ fontSize: '0.9rem', color: '#a0a0b0', marginBottom: 20 }}>
                  Resets attendance data for the event. Participants will remain in the system.
                </p>
                <button
                  className={`${styles['data-importer-btn']} ${styles['data-importer-btn-danger']}`}
                  onClick={handleDeleteAllAttendance}
                  disabled={!selectedEventDelete}
                  style={{ width: '100%', padding: '12px' }}
                >
                  Clear Attendance Info
                </button>
              </div>
            </div>

            <div className={`${styles['data-importer-alert']} ${styles['data-importer-alert-warning']}`} style={{ marginTop: 30 }}>
              <Icon name="warning" alt="Warning" sizePx={20} />
              <span>
                <strong>Warning:</strong> Deleted data cannot be recovered after you leave this page unless you use the "Undo" button immediately.
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className={styles['data-importer-modal-overlay']}>
          <div className={styles['data-importer-modal']}>
            <div className={styles['data-importer-modal-header']}>
              <h2>Confirm Deletion</h2>
            </div>
            <div className={styles['data-importer-modal-body']}>
              <p>
                Are you sure you want to delete all <strong>{deleteConfirmation.type === 'participant' ? 'participants' : 'attendance records'}</strong> for this event?
              </p>
              {deleteConfirmation.type === 'participant' && (
                <p style={{ color: '#ff4757', marginTop: 12 }}>
                  This will also remove all associated attendance records. This cannot be undone once confirmed.
                </p>
              )}
            </div>
            <div className={styles['data-importer-modal-footer']}>
              <button
                className={`${styles['data-importer-btn']} ${styles['data-importer-btn-secondary']}`}
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                onClick={() => setDeleteConfirmation({ isOpen: false, type: null })}
              >
                Cancel
              </button>
              <button
                className={`${styles['data-importer-btn']} ${styles['data-importer-btn-danger']}`}
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                onClick={performDelete}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
