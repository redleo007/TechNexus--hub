import { useState, useEffect } from 'react';
import { Loader, Save, Check, X, AlertTriangle } from 'lucide-react';
import { settingsAPI } from '../api/client';
import './Settings.css';

interface Settings {
  no_show_limit: number;
  auto_block_enabled: boolean;
}

export function Settings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [formData, setFormData] = useState<Settings>({
    no_show_limit: 2,
    auto_block_enabled: true,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = 'Settings - TechNexus Community';
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const res = await settingsAPI.get();
        const data = res.data || {
          no_show_limit: 2,
          auto_block_enabled: true,
        };
        setSettings(data);
        setFormData(data);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setMessage({
          type: 'error',
          text: 'Failed to load settings. Using defaults.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parseInt(value, 10),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.no_show_limit < 1) {
      setMessage({ type: 'error', text: 'No-show limit must be at least 1' });
      return;
    }

    setSaving(true);
    try {
      await settingsAPI.update(formData);
      setSettings(formData);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setFormData(settings);
      setMessage(null);
    }
  };

  if (loading) {
    return (
      <div className="settings loading-container">
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings">
      <div className="page-header">
        <h1>System Settings</h1>
        <p>Configure global system settings</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-grid">
        <div className="card settings-card">
          <h2>Auto-Block Configuration</h2>
          <p className="section-desc">Configure how participants are automatically blocklisted</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="no-show-limit">No-Show Limit</label>
              <div className="input-group">
                <input
                  id="no-show-limit"
                  type="number"
                  name="no_show_limit"
                  value={formData.no_show_limit}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                />
                <span className="input-addon">no-shows</span>
              </div>
              <p className="help-text">
                Participants will be automatically blocklisted after reaching this number of
                no-shows.
              </p>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="auto_block_enabled"
                  checked={formData.auto_block_enabled}
                  onChange={handleInputChange}
                />
                <span className="checkbox-text">Enable Automatic Blocking</span>
              </label>
              <p className="help-text">
                When enabled, participants who reach the no-show limit will be automatically added
                to the blocklist.
              </p>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                {saving ? <><Loader size={18} /> Saving...</> : <><Save size={18} /> Save Settings</>}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={handleReset}
                disabled={saving}
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="card info-card">
          <h2>System Information</h2>

          <div className="info-section">
            <h3>Current Configuration</h3>
            <ul className="config-list">
              <li>
                <span className="label">No-Show Limit:</span>
                <span className="value">{formData.no_show_limit} no-shows</span>
              </li>
              <li>
                <span className="label">Auto-Block Status:</span>
                <span className={`badge ${formData.auto_block_enabled ? 'badge-success' : 'badge-danger'}`}>
                  {formData.auto_block_enabled ? <><Check size={14} /> Enabled</> : <><X size={14} /> Disabled</>}
                </span>
              </li>
            </ul>
          </div>

          <div className="info-section">
            <h3>How Auto-Blocking Works</h3>
            <ol className="process-list">
              <li>
                When attendance is marked as "no-show" for a participant, the system counts their total
                no-shows globally across all events.
              </li>
              <li>
                If the no-show count reaches the configured limit, the participant is automatically
                added to the blocklist.
              </li>
              <li>
                Blocklisted participants cannot be marked as attendees in new events.
              </li>
              <li>
                You can manually remove participants from the blocklist at any time.
              </li>
            </ol>
          </div>

          <div className="info-section warning-section">
            <h3><AlertTriangle size={20} style={{ display: 'inline', marginRight: '8px' }} /> Important Notes</h3>
            <ul className="notes-list">
              <li>Changes to settings apply immediately to all future attendance records.</li>
              <li>Changing the no-show limit does not retroactively affect already-blocklisted
                participants.
              </li>
              <li>Disabling auto-block does not remove already-blocklisted participants.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
