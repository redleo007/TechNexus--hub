import { useState, useEffect } from 'react';
import { Ban, Trash2, Plus, Download } from 'lucide-react';
import { blocklistAPI, participantsAPI } from '../api/client';
import { useAsync } from '../utils/hooks';
import './Blocklist.css';

interface BlocklistEntry {
  id: string;
  participant_id: string;
  reason: string;
  created_at: string;
  participants?: {
    name: string;
    email: string;
  };
}

interface Participant {
  id: string;
  name: string;
  email: string;
  is_blocklisted: boolean;
}

export function Blocklist() {
  const [blocklistData, setBlocklistData] = useState<BlocklistEntry[]>([]);
  const [filteredData, setFilteredData] = useState<BlocklistEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ participant_id: '', reason: '' });

  useEffect(() => {
    document.title = 'Blocklist - TechNexus Community';
  }, []);

  const { data: participants, refetch: refetchParticipants } = useAsync<Participant[]>(
    () => participantsAPI.getAll(false).then((res) => res.data),
    true
  );

  const { refetch: refetchBlocklist } = useAsync<BlocklistEntry[]>(
    async () => {
      setLoading(true);
      try {
        const res = await blocklistAPI.getAll();
        const data = (res.data || []) as BlocklistEntry[];
        setBlocklistData(data);
        setFilteredData(data);
        return data;
      } finally {
        setLoading(false);
      }
    },
    true
  );

  // Search by name
  useEffect(() => {
    const filtered = blocklistData.filter((entry) =>
      entry.participants?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
  }, [searchTerm, blocklistData]);

  const handleAddToBlocklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.participant_id || !formData.reason.trim()) {
      setMessage({ type: 'error', text: 'Please select a participant and enter a reason' });
      return;
    }

    try {
      await blocklistAPI.add({ participant_id: formData.participant_id, reason: formData.reason });
      setMessage({ type: 'success', text: 'Participant added to blocklist' });
      setFormData({ participant_id: '', reason: '' });
      setShowAddForm(false);
      refetchBlocklist();
      refetchParticipants();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to add to blocklist',
      });
    }
  };

  const handleRemoveFromBlocklist = async (participantId: string) => {
    if (!confirm('Remove this participant from blocklist?')) return;

    try {
      await blocklistAPI.remove(participantId);
      setMessage({ type: 'success', text: 'Participant removed from blocklist' });
      refetchBlocklist();
      refetchParticipants();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to remove from blocklist',
      });
    }
  };

  const handleExport = () => {
    if (filteredData.length === 0) {
      setMessage({ type: 'error', text: 'No records to export' });
      return;
    }

    const headers = ['Name', 'Email', 'Reason', 'Date Added'];
    const rows = filteredData.map((entry) => [
      entry.participants?.name || '',
      entry.participants?.email || '',
      entry.reason,
      new Date(entry.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blocklist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="blocklist loading-container">
        <div className="spinner"></div>
        <p>Loading blocklist...</p>
      </div>
    );
  }

  const blocklistedCount = blocklistData.length;
  const nonBlocklistedParticipants = participants?.filter((p) => !p.is_blocklisted) || [];

  return (
    <div className="blocklist">
      <div className="page-header">
        <h1>Blocklist Management</h1>
        <p>Manage blocklisted participants - search, add, edit, remove</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="blocklist-stat">
        <div className="stat-card stat-card-danger">
          <div className="stat-icon"><Ban size={40} /></div>
          <div className="stat-content">
            <h3>Total Blocklisted</h3>
            <p className="stat-value">{blocklistedCount}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="list-header">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="action-buttons">
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              <Download size={16} /> Export CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus size={16} /> Add Entry
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="add-form-section">
            <h3>Add to Blocklist</h3>
            <form onSubmit={handleAddToBlocklist}>
              <div className="form-group">
                <label>Participant</label>
                <select
                  value={formData.participant_id}
                  onChange={(e) => setFormData({ ...formData, participant_id: e.target.value })}
                  required
                >
                  <option value="">Select a participant...</option>
                  {nonBlocklistedParticipants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Enter reason for blocklisting..."
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Add to Blocklist
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {filteredData && filteredData.length > 0 ? (
          <>
            <div className="blocklist-items">
              {filteredData.map((entry) => (
                <div key={entry.id} className="blocklist-item card">
                  <div className="item-header">
                    <div>
                      <h3>{entry.participants?.name || 'Unknown'}</h3>
                      <p className="email">{entry.participants?.email}</p>
                    </div>
                  </div>

                  <div className="item-details">
                    <p><strong>Reason:</strong> {entry.reason}</p>
                  </div>

                  <div className="item-actions">
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemoveFromBlocklist(entry.participant_id)}>
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>{searchTerm ? 'No matches found' : 'No participants in blocklist'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Blocklist;
