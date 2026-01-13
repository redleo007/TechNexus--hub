import { useState } from 'react';
import { Save, X, Plus, CheckCircle, Loader } from 'lucide-react';
import { volunteersAPI, eventsAPI } from '../api/client';
import { useAsync } from '../utils/hooks';
import { formatDate } from '../utils/formatters';
import './AssignWork.css';

interface Volunteer {
  id: string;
  name: string;
  email: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
}

interface WorkAssignment {
  volunteer_id: string;
  event_id: string;
  task_name: string;
  task_status: 'assigned' | 'in_progress' | 'completed';
}

interface WorkHistory {
  id: string;
  volunteer_id: string;
  event_id: string;
  task_name: string;
  task_status: 'assigned' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export function AssignWork() {
  const [showForm, setShowForm] = useState(false);
  const [searchVolunteer, setSearchVolunteer] = useState('');
  const [showVolunteerDropdown, setShowVolunteerDropdown] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [formData, setFormData] = useState({
    event_id: '',
    task_name: '',
    task_status: 'assigned' as const,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshWorkHistory, setRefreshWorkHistory] = useState(0);

  const { data: volunteers, loading: loadingVolunteers } = useAsync<Volunteer[]>(
    () => volunteersAPI.getAll().then((res) => res.data),
    true
  );

  const { data: events, loading: loadingEvents } = useAsync<Event[]>(
    () => eventsAPI.getAll().then((res) => res.data),
    true
  );

  // Fetch work history for selected volunteer
  const { data: workHistory = [], loading: loadingHistory } = useAsync<WorkHistory[]>(
    () => selectedVolunteer ? volunteersAPI.getWorkHistory(selectedVolunteer.id).then((res) => res.data) : Promise.resolve([]),
    true,
    [selectedVolunteer?.id, refreshWorkHistory]
  );

  const filteredVolunteers = volunteers?.filter((v) =>
    v.name.toLowerCase().includes(searchVolunteer.toLowerCase()) ||
    v.email.toLowerCase().includes(searchVolunteer.toLowerCase())
  ) || [];

  const handleSelectVolunteer = (volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setSearchVolunteer(volunteer.name);
    setShowVolunteerDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVolunteer) {
      setMessage({ type: 'error', text: 'Please select a volunteer' });
      return;
    }

    if (!formData.event_id) {
      setMessage({ type: 'error', text: 'Please select an event' });
      return;
    }

    if (!formData.task_name.trim()) {
      setMessage({ type: 'error', text: 'Please enter a task name' });
      return;
    }

    setSubmitting(true);
    try {
      const workData: WorkAssignment = {
        volunteer_id: selectedVolunteer.id,
        event_id: formData.event_id,
        task_name: formData.task_name,
        task_status: formData.task_status,
      };

      // Create work assignment using API
      const result = await volunteersAPI.createWorkAssignment(workData);
      
      if (!result) {
        throw new Error('Failed to create work assignment - no response from server');
      }

      setMessage({ type: 'success', text: 'Work assigned successfully!' });
      
      // Reset form
      setFormData({
        event_id: '',
        task_name: '',
        task_status: 'assigned',
      });

      // Refresh work history immediately
      setRefreshWorkHistory(prev => prev + 1);

      // Close form after 2 seconds
      setTimeout(() => {
        setShowForm(false);
      }, 1500);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setMessage({
        type: 'error',
        text: errorMsg || 'Failed to assign work',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
      event_id: '',
      task_name: '',
      task_status: 'assigned',
    });
    setMessage(null);
  };

  return (
    <div className="assign-work">
      <div className="page-header">
        <div>
          <h1>Assign Work</h1>
          <p>Assign tasks to volunteers for events</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Assign Work</>}
        </button>
      </div>

      {message && (
        <div className={`message-banner ${message.type}`}>
          <p>{message.text}</p>
          <button onClick={() => setMessage(null)} style={{ marginLeft: '8px', cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>✕</button>
        </div>
      )}

      {showForm && (
        <div className="assign-work-form card">
          <h2>Assign New Work</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* Volunteer Selection */}
              <div className="form-group">
                <label htmlFor="volunteer">Volunteer *</label>
                <div className="volunteer-select-container">
                  <input
                    type="text"
                    id="volunteer"
                    placeholder="Search volunteer by name or email..."
                    value={searchVolunteer}
                    onChange={(e) => {
                      setSearchVolunteer(e.target.value);
                      setShowVolunteerDropdown(true);
                      if (selectedVolunteer && e.target.value !== selectedVolunteer.name) {
                        setSelectedVolunteer(null);
                      }
                    }}
                    onFocus={() => setShowVolunteerDropdown(true)}
                    disabled={loadingVolunteers}
                    className="search-input"
                  />
                  {showVolunteerDropdown && (
                    <div className="dropdown-menu">
                      {loadingVolunteers ? (
                        <div className="dropdown-item disabled">Loading...</div>
                      ) : filteredVolunteers.length === 0 ? (
                        <div className="dropdown-item disabled">No volunteers found</div>
                      ) : (
                        filteredVolunteers.map((v) => (
                          <div
                            key={v.id}
                            className={`dropdown-item ${selectedVolunteer?.id === v.id ? 'active' : ''}`}
                            onClick={() => handleSelectVolunteer(v)}
                          >
                            <div className="volunteer-item">
                              <div className="volunteer-name">{v.name}</div>
                              <div className="volunteer-email">{v.email}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {selectedVolunteer && (
                  <div className="selected-volunteer">
                    <CheckCircle size={16} /> {selectedVolunteer.name}
                  </div>
                )}
              </div>

              {/* Event Selection */}
              <div className="form-group">
                <label htmlFor="event">Event *</label>
                <select
                  id="event"
                  name="event_id"
                  value={formData.event_id}
                  onChange={handleInputChange}
                  disabled={loadingEvents}
                  required
                >
                  <option value="">Select an event...</option>
                  {events?.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({formatDate(e.date)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Name */}
              <div className="form-group">
                <label htmlFor="task_name">Task Name *</label>
                <input
                  id="task_name"
                  type="text"
                  name="task_name"
                  value={formData.task_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Registration, Setup, Cleanup"
                  required
                />
              </div>

              {/* Task Status */}
              <div className="form-group">
                <label htmlFor="task_status">Task Status</label>
                <select
                  id="task_status"
                  name="task_status"
                  value={formData.task_status}
                  onChange={handleInputChange}
                >
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                <X size={16} /> Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <><Loader size={16} className="animate-spin" /> Assigning...</>
                ) : (
                  <><Save size={16} /> Assign Work</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Work History */}
      {!showForm && selectedVolunteer && (
        <div className="work-history-section card">
          <div className="section-header">
            <div>
              <h2>Work History</h2>
              <p>{selectedVolunteer.name} - {selectedVolunteer.email}</p>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedVolunteer(null);
                setSearchVolunteer('');
              }}
            >
              Change Volunteer
            </button>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Loader size={32} className="animate-spin" style={{ margin: '0 auto' }} />
              <p>Loading work history...</p>
            </div>
          ) : workHistory.length === 0 ? (
            <div className="empty-state-inline">
              <p>No work assignments yet. Click "Assign Work" above to get started.</p>
            </div>
          ) : (
            <div className="work-history-table">
              <table>
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {workHistory.map((work) => (
                    <tr key={work.id}>
                      <td>{work.task_name}</td>
                      <td>
                        {events?.find(e => e.id === work.event_id)?.name || work.event_id}
                      </td>
                      <td>
                        <span className={`badge badge-${work.task_status}`}>
                          {work.task_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{formatDate(work.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!showForm && !selectedVolunteer && (
        <div className="empty-state card">
          <div className="empty-state-content">
            <CheckCircle size={48} />
            <h3>Assign Work to Volunteers</h3>
            <p>Select a volunteer from the form above to view their work history and assign new tasks</p>
          </div>
        </div>
      )}
    </div>
  );
}
