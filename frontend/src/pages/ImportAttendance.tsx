import { useState } from 'react';
import { Trash2, Loader, CheckCircle, AlertTriangle, Check } from 'lucide-react';
import Papa from 'papaparse';
import { participantsAPI, attendanceAPI, eventsAPI, volunteersAPI } from '../api/client';
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

interface Participant {
  id: string;
  name: string;
  email: string;
  is_blocklisted: boolean;
}

interface AttendanceRecord {
  id: string;
  participant_id: string;
  status: string;
  created_at: string;
}

export function ImportAttendance() {
  const [activeTab, setActiveTab] = useState<'participants' | 'attendance' | 'volunteer_attendance' | 'delete'>('participants');
  
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

  // Volunteer attendance import state
  const [selectedEventVolunteerAttendance, setSelectedEventVolunteerAttendance] = useState<string>('');
  const [volunteerAttendanceFileData, setVolunteerAttendanceFileData] = useState<ParsedAttendance[]>([]);
  const [volunteerAttendanceMessage, setVolunteerAttendanceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importingVolunteerAttendance, setImportingVolunteerAttendance] = useState(false);

  // Delete state
  const [selectedEventDelete, setSelectedEventDelete] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [selectedAttendance, setSelectedAttendance] = useState<Set<string>>(new Set());
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'participant' | 'attendance' | null;
    deleteAll: boolean;
    count: number;
  }>({
    isOpen: false,
    type: null,
    deleteAll: false,
    count: 0,
  });

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

  // Volunteer attendance file handler
  const handleVolunteerAttendanceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mappedData = (results.data as any[]).map(mapAttendanceColumns);
        setVolunteerAttendanceFileData(mappedData);
        setVolunteerAttendanceMessage(null);
      },
      error: (error) => {
        setVolunteerAttendanceMessage({ type: 'error', text: `CSV parsing error: ${error.message || 'Unknown error'}` });
      },
    });
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

  // Load participants for an event
  const loadEventParticipants = async (eventId: string) => {
    if (!eventId) {
      setParticipants([]);
      return;
    }

    try {
      const response = await eventsAPI.getParticipants(eventId);
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setParticipants(data);
      setSelectedParticipants(new Set());
    } catch (error) {
      console.error('Failed to load participants:', error);
      alert('Failed to load participants. Please try again.');
    }
  };

  // Load attendance for an event
  const loadEventAttendance = async (eventId: string) => {
    if (!eventId) {
      setAttendance([]);
      return;
    }

    try {
      const response = await eventsAPI.getAttendance(eventId);
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setAttendance(data);
      setSelectedAttendance(new Set());
    } catch (error) {
      console.error('Failed to load attendance:', error);
      alert('Failed to load attendance records. Please try again.');
    }
  };

  // Handle event selection for deletion
  const handleDeleteEventChange = (eventId: string) => {
    setSelectedEventDelete(eventId);
    if (eventId) {
      loadEventParticipants(eventId);
      loadEventAttendance(eventId);
    }
  };

  // Toggle participant selection
  const toggleParticipantSelection = (id: string) => {
    const newSelected = new Set(selectedParticipants);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedParticipants(newSelected);
  };

  // Toggle attendance selection
  const toggleAttendanceSelection = (id: string) => {
    const newSelected = new Set(selectedAttendance);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAttendance(newSelected);
  };

  // Handle delete all participants
  const handleDeleteAllParticipants = () => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'participant',
      deleteAll: true,
      count: participants.length,
    });
  };

  // Handle delete selected participants
  const handleDeleteSelectedParticipants = () => {
    if (selectedParticipants.size === 0) {
      alert('Please select at least one participant to delete.');
      return;
    }
    setDeleteConfirmation({
      isOpen: true,
      type: 'participant',
      deleteAll: false,
      count: selectedParticipants.size,
    });
  };

  // Handle delete all attendance
  const handleDeleteAllAttendance = () => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'attendance',
      deleteAll: true,
      count: attendance.length,
    });
  };

  // Handle delete selected attendance
  const handleDeleteSelectedAttendance = () => {
    if (selectedAttendance.size === 0) {
      alert('Please select at least one attendance record to delete.');
      return;
    }
    setDeleteConfirmation({
      isOpen: true,
      type: 'attendance',
      deleteAll: false,
      count: selectedAttendance.size,
    });
  };

  // Perform delete
  const performDelete = async () => {
    if (!deleteConfirmation.type) return;

    try {
      let result;

      if (deleteConfirmation.type === 'participant') {
        if (deleteConfirmation.deleteAll) {
          result = await eventsAPI.deleteAllParticipants(selectedEventDelete);
        } else {
          result = await eventsAPI.deleteSelectedParticipants(
            selectedEventDelete,
            Array.from(selectedParticipants)
          );
        }
        
        await loadEventParticipants(selectedEventDelete);
        alert(`Successfully deleted ${result.data.deleted} participant(s).`);
      } else if (deleteConfirmation.type === 'attendance') {
        if (deleteConfirmation.deleteAll) {
          result = await eventsAPI.deleteAllAttendance(selectedEventDelete);
        } else {
          result = await eventsAPI.deleteSelectedAttendance(
            selectedEventDelete,
            Array.from(selectedAttendance)
          );
        }
        
        await loadEventAttendance(selectedEventDelete);
        alert(`Successfully deleted ${result.data.deleted} attendance record(s).`);
      }

      setDeleteConfirmation({
        isOpen: false,
        type: null,
        deleteAll: false,
        count: 0,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`Failed to delete: ${errorMsg}`);
    }
  };

  // Suppress unused function warnings
  void handleDeleteEventChange;
  void toggleParticipantSelection;
  void toggleAttendanceSelection;
  void handleDeleteAllParticipants;
  void handleDeleteSelectedParticipants;
  void handleDeleteAllAttendance;
  void handleDeleteSelectedAttendance;
  void performDelete;

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
      await participantsAPI.bulkCreateWithEventBatch({
        participants: participantFileData.map(row => ({
          full_name: row.name.trim(),
          event_id: selectedEventParticipants,
        })),
      });

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
      // Send all attendance records in one bulk request
      const response = await attendanceAPI.bulkImportBatch({
        records: attendanceFileData.map(row => ({
          name: row.name.trim(),
          email: row.email.trim(),
          event_id: selectedEventAttendance,
          attendance_status: normalizeStatus(row.status),
        })),
      });
      
      // Suppress unused variable warning - response contains session data
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

  const handleImportVolunteerAttendance = async () => {
    if (volunteerAttendanceFileData.length === 0) {
      setVolunteerAttendanceMessage({ type: 'error', text: 'No data to import. Please select a CSV file.' });
      return;
    }

    if (!selectedEventVolunteerAttendance) {
      setVolunteerAttendanceMessage({ type: 'error', text: 'Please select an event before importing volunteer attendance.' });
      return;
    }

    const invalidRows = volunteerAttendanceFileData.filter((row) => !isValidAttendanceRow(row));
    if (invalidRows.length > 0) {
      const missingFields = invalidRows.map(row => {
        const issues = [];
        if (!row.name || !row.name.trim()) issues.push('missing name');
        if (!row.email || !row.email.trim()) issues.push('missing email');
        if (row.email && !row.email.includes('@')) issues.push('invalid email format');
        return `"${row.name || 'N/A'}" - ${issues.join(', ')}`;
      });
      setVolunteerAttendanceMessage({
        type: 'error',
        text: `Cannot import: ${invalidRows.length} rows are invalid:\n${missingFields.slice(0, 3).join('\n')}${invalidRows.length > 3 ? `\n... and ${invalidRows.length - 3} more` : ''}`,
      });
      return;
    }

    setImportingVolunteerAttendance(true);

    try {
      // Send all volunteer attendance records in one bulk request
      const response = await volunteersAPI.bulkImportAttendance(selectedEventVolunteerAttendance, {
        records: volunteerAttendanceFileData.map(row => ({
          name: row.name.trim(),
          email: row.email.trim(),
          event_id: selectedEventVolunteerAttendance,
          attendance_status: normalizeStatus(row.status),
        })),
      });
      
      // Suppress unused variable warning - response contains session data
      void response;

      setVolunteerAttendanceMessage({
        type: 'success',
        text: `Import completed successfully! ${volunteerAttendanceFileData.length} volunteer attendance records imported.`,
      });

      setVolunteerAttendanceFileData([]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setVolunteerAttendanceMessage({
        type: 'error',
        text: `Import failed: ${errorMsg}`,
      });
    } finally {
      setImportingVolunteerAttendance(false);
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
          <button
            className={`tab-button ${activeTab === 'volunteer_attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('volunteer_attendance')}
          >
            Import Volunteer Attendance
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
                  <span><Check size={16} /> File loaded: {participantFileData.length} rows</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setParticipantFileData([])}
                  >
                    <Trash2 size={16} /> Delete File
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
                      <Trash2 size={16} /> Delete Preview
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
                    {importingParticipants ? <><Loader size={16} /> Importing...</> : <><CheckCircle size={16} /> Import Participants</>}
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
                  <span><Check size={16} /> File loaded: {attendanceFileData.length} rows</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setAttendanceFileData([])}
                  >
                    <Trash2 size={16} /> Delete File
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
                      <Trash2 size={16} /> Delete Preview
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
                    {importingAttendance ? <><Loader size={16} /> Importing...</> : <><CheckCircle size={16} /> Import Attendance</>}
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

      {/* Volunteer Attendance Tab */}
      {activeTab === 'volunteer_attendance' && (
        <div className="tab-content card">
          {volunteerAttendanceMessage && (
            <div className={`alert alert-${volunteerAttendanceMessage.type}`}>
              {volunteerAttendanceMessage.text}
            </div>
          )}

          <div className="import-section">
            <div className="section-header">
              <h2>Import Volunteer Attendance</h2>
            </div>

            {/* Event Selector */}
            <div className="event-selector">
              <label htmlFor="volunteer-attendance-event-select">Select Event *</label>
              <select
                id="volunteer-attendance-event-select"
                value={selectedEventVolunteerAttendance}
                onChange={(e) => setSelectedEventVolunteerAttendance(e.target.value)}
              >
                <option value="">-- Choose an event --</option>
                {events && events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div className="file-upload-section">
              <div className="file-input-wrapper">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleVolunteerAttendanceFileSelect}
                  id="volunteer-attendance-file"
                  disabled={importingVolunteerAttendance}
                />
                <label htmlFor="volunteer-attendance-file" className="file-label">
                  Choose CSV File
                </label>
              </div>
              <p className="file-hint">
                CSV format: name, email, status (optional: attended, not attended, no-show)
              </p>
            </div>

            {/* Data Preview and Import */}
            {volunteerAttendanceFileData.length > 0 && (
              <>
                <div className="preview-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Preview ({volunteerAttendanceFileData.length} rows)</h3>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setVolunteerAttendanceFileData([])}
                      title="Delete and remove this file from preview"
                      disabled={importingVolunteerAttendance}
                    >
                      <Trash2 size={16} /> Delete Preview
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
                        {volunteerAttendanceFileData.map((row, idx) => {
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
                </div>

                <div className="import-actions">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleImportVolunteerAttendance}
                    disabled={importingVolunteerAttendance}
                  >
                    {importingVolunteerAttendance ? <><Loader size={16} /> Importing...</> : <><CheckCircle size={16} /> Import Volunteer Attendance</>}
                  </button>
                  <button
                    className="btn btn-secondary btn-lg"
                    onClick={() => setVolunteerAttendanceFileData([])}
                    disabled={importingVolunteerAttendance}
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
          <div className="section-header">
            <h2>Delete Participants & Attendance</h2>
            <p>Select an event and choose which participants or attendance records to delete</p>
          </div>

          {/* Event Selector */}
          <div className="form-group">
            <label htmlFor="delete-event-select">Select Event:</label>
            <select
              id="delete-event-select"
              value={selectedEventDelete}
              onChange={(e) => handleDeleteEventChange(e.target.value)}
              className="form-control"
            >
              <option value="">-- Choose an event --</option>
              {events?.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} - {new Date(event.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {selectedEventDelete && (
            <>
              {/* Participants Section */}
              <div className="delete-section">
                <div className="section-header">
                  <h3>Participants ({participants.length})</h3>
                  <div className="button-group">
                    <button
                      className="btn btn-danger"
                      onClick={handleDeleteAllParticipants}
                      disabled={participants.length === 0}
                    >
                      Delete All Participants
                    </button>
                    <button
                      className="btn btn-warning"
                      onClick={handleDeleteSelectedParticipants}
                      disabled={selectedParticipants.size === 0}
                    >
                      Delete Selected ({selectedParticipants.size})
                    </button>
                  </div>
                </div>

                {participants.length > 0 ? (
                  <div className="checkbox-list">
                    {participants.map((participant) => (
                      <label key={participant.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedParticipants.has(participant.id)}
                          onChange={() => toggleParticipantSelection(participant.id)}
                        />
                        <span className="checkbox-text">
                          {participant.name} ({participant.email})
                          {participant.is_blocklisted && <span className="blocklisted-badge">Blocklisted</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="empty-message">No participants found for this event.</p>
                )}
              </div>

              {/* Attendance Section */}
              <div className="delete-section">
                <div className="section-header">
                  <h3>Attendance Records ({attendance.length})</h3>
                  <div className="button-group">
                    <button
                      className="btn btn-danger"
                      onClick={handleDeleteAllAttendance}
                      disabled={attendance.length === 0}
                    >
                      Delete All Attendance
                    </button>
                    <button
                      className="btn btn-warning"
                      onClick={handleDeleteSelectedAttendance}
                      disabled={selectedAttendance.size === 0}
                    >
                      Delete Selected ({selectedAttendance.size})
                    </button>
                  </div>
                </div>

                {attendance.length > 0 ? (
                  <div className="checkbox-list">
                    {attendance.map((record) => (
                      <label key={record.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedAttendance.has(record.id)}
                          onChange={() => toggleAttendanceSelection(record.id)}
                        />
                        <span className="checkbox-text">
                          Participant {record.participant_id} - {record.status} ({new Date(record.created_at).toLocaleDateString()})
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="empty-message">No attendance records found for this event.</p>
                )}
              </div>
            </>
          )}

          {!selectedEventDelete && (
            <div className="empty-message">Please select an event to view and manage participants and attendance.</div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Confirm Delete</h2>
            </div>
            <div className="modal-body">
              <p className="warning-message">
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: '8px' }} /> You are about to permanently delete {deleteConfirmation.count} {deleteConfirmation.type === 'participant' ? 'participant(s)' : 'attendance record(s)'}. 
                {deleteConfirmation.type === 'participant' && ' This will also delete all associated attendance records. '}
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setDeleteConfirmation({
                  isOpen: false,
                  type: null,
                  deleteAll: false,
                  count: 0,
                })}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-delete"
                onClick={performDelete}
              >
                Delete {deleteConfirmation.type === 'participant' ? 'Participant(s)' : 'Attendance Record(s)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

