import { useState, useEffect } from 'react';
import { volunteersAPI } from '../api/client';
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
            {showForm ? '✕ Cancel' : '➕ Add Volunteer'}
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
                <label htmlFor="comment">Comment *</label>
                <input
                  id="comment"
                  type="text"
                  name="comment"
                  value={formData.comment}
                  onChange={handleInputChange}
                  placeholder="e.g., Team Lead, Event Organizer"
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
                  placeholder="Enter location/place"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-lg">
                {editingId ? '💾 Update Volunteer' : '✅ Add Volunteer'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="volunteers-grid">
        {volunteers && volunteers.length > 0 ? (
          <div className="grid grid-cols-3">
            {volunteers.map((volunteer) => (
              <div key={volunteer.id} className="volunteer-card card">
                <div className="volunteer-header">
                  <div className="header-content">
                    <h3>{volunteer.name}</h3>
                    <span className="role-badge">{volunteer.comment}</span>
                  </div>
                  <span className={`status-badge ${volunteer.is_active ? 'active' : 'inactive'}`}>
                    {volunteer.is_active ? '✓ Active' : '✕ Inactive'}
                  </span>
                </div>

                <div className="volunteer-info">
                  <p>
                    <strong>Email:</strong> {volunteer.email}
                  </p>
                  {volunteer.place && (
                    <p>
                      <strong>Place:</strong> {volunteer.place}
                    </p>
                  )}
                  <p className="joined-date">
                    📅 Joined {formatDate(volunteer.joined_date)}
                  </p>
                </div>

                <div className="volunteer-actions">
                  <button
                    className={`btn ${volunteer.is_active ? 'btn-warning' : 'btn-success'} btn-sm`}
                    onClick={() => handleToggleStatus(volunteer.id, volunteer.is_active)}
                    disabled={togglingId === volunteer.id}
                  >
                    {togglingId === volunteer.id ? 'Updating...' : volunteer.is_active ? '🔒 Inactive' : '🔓 Active'}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEdit(volunteer)}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(volunteer.id)}
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No volunteers registered yet</p>
          </div>
        )}
      </div>

      <div className="stats-section card">
        <h3>Volunteer Statistics</h3>
        <div className="stat-grid">
          <div className="stat-item">
            <span className="label">Total Volunteers</span>
            <span className="value">{volunteers?.length || 0}</span>
          </div>
          <div className="stat-item">
            <span className="label">Active Volunteers</span>
            <span className="value">{volunteers?.filter(v => v.is_active).length || 0}</span>
          </div>
          <div className="stat-item">
            <span className="label">Inactive Volunteers</span>
            <span className="value">{volunteers?.filter(v => !v.is_active).length || 0}</span>
          </div>
          <div className="stat-item">
            <span className="label">Sorted By</span>
            <span className="value">{sortBy === 'newest' ? 'Newest' : 'Oldest'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
