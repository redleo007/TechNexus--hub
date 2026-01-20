import { useState, useEffect } from 'react';
import { X, Plus, Save, CheckCircle, Calendar, MapPin, Edit, Trash2 } from 'lucide-react';
import { eventsAPI } from '../api/client';
import { useAsync } from '../utils/hooks';
import { formatDate } from '../utils/formatters';
import './Events.css';

interface Event {
  id: string;
  name: string;
  date: string;
  location?: string;
  description?: string;
  created_at: string;
}

export function Events() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  useEffect(() => {
    document.title = 'Events - TechNexus Community';
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    description: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: events, loading, refetch } = useAsync<Event[]>(
    () => eventsAPI.getAll().then((res) => res.data),
    true
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.date) {
      setMessage({ type: 'error', text: 'Event name and date are required' });
      return;
    }

    try {
      if (editingId) {
        await eventsAPI.update(editingId, formData);
        setMessage({ type: 'success', text: 'Event updated successfully' });
      } else {
        await eventsAPI.create(formData);
        setMessage({ type: 'success', text: 'Event created successfully' });
      }

      setFormData({ name: '', date: '', location: '', description: '' });
      setEditingId(null);
      setShowForm(false);
      refetch();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save event',
      });
    }
  };

  const handleEdit = (event: Event) => {
    setFormData({
      name: event.name,
      date: event.date.split('T')[0],
      location: event.location || '',
      description: event.description || '',
    });
    setEditingId(event.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await eventsAPI.delete(id);
      setMessage({ type: 'success', text: 'Event deleted successfully' });
      refetch();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete event',
      });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', date: '', location: '', description: '' });
  };

  if (loading) {
    return (
      <div className="events loading-container">
        <div className="spinner"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  return (
    <div className="events">
      <div className="page-header">
        <div>
          <h1>Events Management</h1>
          <p>Create and manage events</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) handleCancel();
          }}
        >
          {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Event</>}
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="event-form card">
          <h2>{editingId ? 'Edit Event' : 'Create New Event'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Event Name *</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter event name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="date">Date *</label>
              <input
                id="date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter event location"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter event description"
              ></textarea>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-lg">
                {editingId ? <><Save size={18} /> Update Event</> : <><CheckCircle size={18} /> Create Event</>}
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

      <div className="events-list">
        {events && events.length > 0 ? (
          <div className="grid grid-cols-2">
            {events.map((event) => (
              <div key={event.id} className="event-card card">
                <div className="event-header">
                  <h3>{event.name}</h3>
                  <span className="event-date"><Calendar size={16} style={{ display: 'inline', marginRight: '4px' }} /> {formatDate(event.date)}</span>
                </div>

                {event.location && (
                  <p className="event-location">
                    <MapPin size={16} /> {event.location}
                  </p>
                )}

                {event.description && (
                  <p className="event-description">{event.description}</p>
                )}

                <div className="event-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEdit(event)}
                  >
                    <Edit size={16} /> Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(event.id)}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No events found. Create your first event!</p>
          </div>
        )}
      </div>
    </div>
  );
}
