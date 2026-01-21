import { useEffect, useState } from "react";
import { Calendar, Users, AlertCircle, Ban, RefreshCcw } from "lucide-react";
import "./Dashboard.css";

interface DashboardStats {
  events: number;
  participants: number;
  noShows: number;
  blocklisted: number;
  lastUpdated: string;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Dashboard - TechNexus Community";
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/summary");
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`);
      }
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error(`Invalid response type: ${contentType}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-header"><h1>Dashboard</h1></div>
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-primary" onClick={loadDashboardData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div><h1>Dashboard</h1><p>Real-time system overview</p></div>
        <button className="btn btn-secondary btn-sm" onClick={loadDashboardData}>
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Calendar size={24} /></div>
          <div className="stat-content"><h3>Events</h3><p className="stat-value">{stats?.events || 0}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-content"><h3>Participants</h3><p className="stat-value">{stats?.participants || 0}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><AlertCircle size={24} /></div>
          <div className="stat-content"><h3>No-Shows</h3><p className="stat-value">{stats?.noShows || 0}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Ban size={24} /></div>
          <div className="stat-content"><h3>Blocklisted</h3><p className="stat-value">{stats?.blocklisted || 0}</p></div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Access</h2>
        <div className="actions-grid">
          <a href="/events" className="action-card"><Calendar size={24} /><h4>Events</h4></a>
          <a href="/participants" className="action-card"><Users size={24} /><h4>Participants</h4></a>
          <a href="/no-shows" className="action-card"><AlertCircle size={24} /><h4>No-Shows</h4></a>
          <a href="/blocklist" className="action-card"><Ban size={24} /><h4>Blocklist</h4></a>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
