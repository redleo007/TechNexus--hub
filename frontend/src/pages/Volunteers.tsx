import { useState, useEffect } from 'react';
import { X, Plus, Save, CheckCircle, Lock, Unlock, Trash2, Calendar, ClipboardList, Loader } from 'lucide-react';
import { volunteersAPI } from '../api/client';
import { VolunteerWorkRow, VolunteerWork } from '../components/VolunteerWorkRow';
import { useAsync } from '../utils/hooks';
import { formatDate } from '../utils/formatters';
import './Volunteers.css';

interface Volunteer {
  id: string;
  name: string;
  email: string;
  comment: string;
  place?: string;
  is_active: boolean;
  joined_date: string;
}

export function Volunteers() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [showWorkHistory, setShowWorkHistory] = useState(false);
  const [workHistory, setWorkHistory] = useState<VolunteerWork[]>([]);
  const [loadingWork, setLoadingWork] = useState(false);
  const [workFilter, setWorkFilter] = useState<{ volunteerId: string; volunteerName: string }>({ volunteerId: '', volunteerName: '' });
  const [searchWork, setSearchWork] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    comment: '',
    place: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: volunteers, loading, refetch } = useAsync<Volunteer[]>(
    () => volunteersAPI.getAll(sortBy).then((res) => res.data),
    true
  );

  useEffect(() => {
    refetch();
  }, [sortBy]);

  // Load work history for selected volunteer - using real API
  const handleViewWorkHistory = async (volunteerId: string, volunteerName: string) => {
    setWorkFilter({ volunteerId, volunteerName });
    setShowWorkHistory(true);
    setLoadingWork(true);
    try {
      // Use real API endpoint: GET /volunteers/{volunteer_id}/work-history
      const response = await volunteersAPI.getWorkHistory(volunteerId);
      const workData: VolunteerWork[] = response.data || [];
      setWorkHistory(workData);
    } catch (error) {
      // If endpoint doesn't exist yet, show empty state
      setWorkHistory([]);
    } finally {
      setLoadingWork(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.comment) {
      setMessage({ type: 'error', text: 'Name, email, and comment are required' });
      return;
    }

    try {
      if (editingId) {
        await volunteersAPI.update(editingId, formData);
        setMessage({ type: 'success', text: 'Volunteer updated successfully' });
      } else {
        await volunteersAPI.create(formData);
        setMessage({ type: 'success', text: 'Volunteer added successfully' });
      }

      setFormData({ name: '', email: '', comment: '', place: '' });
      setEditingId(null);
      setShowForm(false);
      refetch();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save volunteer',
      });
    }
  };

  const handleEdit = (volunteer: Volunteer) => {
    setFormData({
      name: volunteer.name,
      email: volunteer.email,
      comment: volunteer.comment,
      place: volunteer.place || '',
    });
    setEditingId(volunteer.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this volunteer?')) return;

    try {
      await volunteersAPI.delete(id);
      setMessage({ type: 'success', text: 'Volunteer removed successfully' });
      refetch();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to remove volunteer',
      });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', email: '', comment: '', place: '' });
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setTogglingId(id);
    try {
      const newStatus = !currentStatus;
      await volunteersAPI.toggleStatus(id, newStatus);
      setMessage({ 
        type: 'success', 
        text: `Volunteer ${newStatus ? 'activated' : 'deactivated'} successfully` 
      });
      refetch();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to toggle volunteer status',
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Handle deletion of work assignment
  const handleDeleteWorkAssignment = async (workId: string) => {
    if (!confirm('Delete this work assignment?')) return;

    try {
      await volunteersAPI.deleteWorkAssignment(workId);
      setMessage({ type: 'success', text: 'Work assignment deleted' });
      
      // Reload work history
      if (workFilter.volunteerId) {
        const response = await volunteersAPI.getWorkHistory(workFilter.volunteerId);
        setWorkHistory(response.data || []);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete work assignment' });
      console.error('Error deleting work:', error);
    }
  };

  const handleDeleteAllWorkAssignments = async () => {
    if (!workFilter.volunteerId) return;

    try {
      // Delete all work assignments for this volunteer
      // Since the API might not have a bulk delete, we'll delete individually
      const deletePromises = workHistory.map(work => 
        volunteersAPI.deleteWorkAssignment(work.id)
      );
      await Promise.all(deletePromises);
      
      setMessage({ type: 'success', text: 'All work assignments deleted' });
      setWorkHistory([]);
      setShowWorkHistory(false);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete work assignments' });
      console.error('Error deleting all work:', error);
    }
  };

  const filteredWorkHistory = workHistory.filter((work) =>
    work.task_name.toLowerCase().includes(searchWork.toLowerCase())
  );

  if (loading) {
    return (
      <div className="volunteers loading-container">
        <div className="spinner"></div>
        <p>Loading volunteers...</p>
      </div>
    );
  }

  return (
    <div className="volunteers">
      <div className="page-header">
        <div>
          <h1>Volunteer Management</h1>
          <p>Manage volunteer information and roles</p>
        </div>
        <div className="header-actions">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
            className="sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) handleCancel();
            }}
          >
            {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Volunteer</>}
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="volunteer-form card">
          <h2>{editingId ? 'Edit Volunteer' : 'Add New Volunteer'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter volunteer name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="place">Place</label>
                <input
                  id="place"
                  type="text"
                  name="place"
                  value={formData.place}
                  onChange={handleInputChange}
                  placeholder="Enter place of residence or work"
                />
              </div>

              <div className="form-group">
                <label htmlFor="comment">Comment *</label>
                <input
                  id="comment"
                  type="text"
                  name="comment"
                  value={formData.comment}
                  onChange={handleInputChange}
                  placeholder="Enter any additional information"
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                <X size={16} /> Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={16} /> {editingId ? 'Update' : 'Add'} Volunteer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Work History Section */}
      {showWorkHistory && (
        <div className="work-history-section card">
          <div className="section-header">
            <div>
              <h2><ClipboardList size={24} style={{ display: 'inline', marginRight: '8px' }} /> Work History for {workFilter.volunteerName}</h2>
              <p style={{ marginTop: '4px', color: '#999', fontSize: '0.9rem' }}>
                Showing {filteredWorkHistory.length} work assignment{filteredWorkHistory.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {filteredWorkHistory.length > 0 && (
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    if (confirm('Delete all work assignments for this volunteer? This cannot be undone.')) {
                      handleDeleteAllWorkAssignments();
                    }
                  }}
                  style={{ padding: '8px 16px' }}
                  title="Delete all work assignments"
                >
                  <Trash2 size={16} /> Delete All
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowWorkHistory(false);
                  setWorkHistory([]);
                  setSearchWork('');
                }}
                style={{ padding: '8px 16px' }}
              >
                <X size={16} /> Close
              </button>
            </div>
          </div>

          {loadingWork ? (
            <div className="loading-container">
              <Loader size={32} className="animate-spin" />
              <p>Loading work history...</p>
            </div>
          ) : filteredWorkHistory.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={40} />
              <p>{searchWork ? 'No matching work assignments' : 'No work assignments yet'}</p>
            </div>
          ) : (
            <>
              <div className="work-filter">
                <input
                  type="text"
                  placeholder="Search by task name..."
                  value={searchWork}
                  onChange={(e) => setSearchWork(e.target.value)}
                  className="search-input"
                  style={{ maxWidth: '300px' }}
                />
              </div>

              <div className="work-history-list">
                {filteredWorkHistory.map((work) => (
                  <VolunteerWorkRow
                    key={work.id}
                    work={work}
                    onDelete={handleDeleteWorkAssignment}
                    showEventName={true}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Volunteers Grid */}
      <div className="volunteers-grid">
        {volunteers && volunteers.length === 0 ? (
          <div className="empty-state">
            <p>No volunteers yet. Click "Add Volunteer" to get started.</p>
          </div>
        ) : (
          volunteers?.map((volunteer) => (
            <div key={volunteer.id} className="volunteer-card card">
              <div className="card-header">
                <div className="volunteer-name-section">
                  <h3>{volunteer.name}</h3>
                  <span className={`status-badge ${volunteer.is_active ? 'active' : 'inactive'}`}>
                    {volunteer.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button
                  className={`btn btn-sm ${volunteer.is_active ? 'btn-warning' : 'btn-success'}`}
                  onClick={() => handleToggleStatus(volunteer.id, volunteer.is_active)}
                  disabled={togglingId === volunteer.id}
                  title={volunteer.is_active ? 'Deactivate' : 'Activate'}
                  style={{ padding: '4px 8px' }}
                >
                  {volunteer.is_active ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
              </div>

              <div className="card-content">
                <p className="volunteer-email">
                  <span className="label">Email:</span> {volunteer.email}
                </p>
                {volunteer.place && (
                  <p className="volunteer-place">
                    <span className="label">Place:</span> {volunteer.place}
                  </p>
                )}
                <p className="volunteer-comment">
                  <span className="label">Comment:</span> {volunteer.comment}
                </p>
                <p className="volunteer-date">
                  <Calendar size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Joined: {formatDate(volunteer.joined_date)}
                </p>
              </div>

              <div className="card-actions">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleViewWorkHistory(volunteer.id, volunteer.name)}
                  style={{ padding: '6px 12px' }}
                >
                  <ClipboardList size={14} style={{ marginRight: '4px' }} /> Work History
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleEdit(volunteer)}
                  style={{ padding: '6px 12px' }}
                >
                  <CheckCircle size={14} style={{ marginRight: '4px' }} /> Edit
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(volunteer.id)}
                  style={{ padding: '6px 12px' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
