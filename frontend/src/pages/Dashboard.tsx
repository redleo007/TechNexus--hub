import { useEffect, useState } from "react";
import { Calendar, Users, AlertCircle, Ban, RefreshCcw, AlertTriangle } from "lucide-react";
import { dashboardAPI } from "../api/client";
import "./Dashboard.css";

interface DashboardStats {
  totalEvents: number;
  totalParticipants: number;
  totalNoShows: number;
  totalBlocklisted: number;
}

// Default fallback stats (primitives only)
const DEFAULT_STATS: DashboardStats = {
  totalEvents: 0,
  totalParticipants: 0,
  totalNoShows: 0,
  totalBlocklisted: 0,
};

/**
 * Safely extract stats from API response
 * Handles multiple response formats and validates data
 */
const extractStatsFromResponse = (response: any): DashboardStats => {
  try {
    const data = response?.data ?? response ?? {};

    // Helper to coerce various input types into a safe integer (primitive number)
    const toNumber = (v: any): number => {
      if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
      if (typeof v === 'string') {
        const n = Number(v.replace(/[^0-9.]/g, ''));
        return Number.isFinite(n) ? Math.trunc(n) : 0;
      }
      return 0;
    };

    // Map only the allowed primitive fields. Support common naming variants from API.
    const totalEvents = toNumber(data?.totalEvents ?? data?.events ?? data?.total_events ?? 0);
    const totalParticipants = toNumber(
      data?.totalParticipants ?? data?.participants ?? data?.total_participants ?? data?.activeParticipants ?? 0,
    );
    const totalNoShows = toNumber(data?.totalNoShows ?? data?.noShows ?? data?.no_shows ?? 0);
    const totalBlocklisted = toNumber(
      data?.totalBlocklisted ?? data?.blocklisted ?? data?.blocklistedParticipants ?? data?.blocklisted_participants ?? 0,
    );

    return {
      totalEvents,
      totalParticipants,
      totalNoShows,
      totalBlocklisted,
    };
  } catch (error) {
    console.error('Error extracting stats:', error);
    return DEFAULT_STATS;
  }
};

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
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
      // Call API with timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      let response;
      try {
        // Use getSummary endpoint for aggregated dashboard data
        response = await dashboardAPI.getSummary();
        clearTimeout(timeoutId);
      } catch (timeoutError) {
        clearTimeout(timeoutId);
        throw new Error('Dashboard API request timed out');
      }

      // Safely extract and validate stats
      const extractedStats = extractStatsFromResponse(response);
      setStats(extractedStats);
      
      // Clear error if previously set
      setError(null);
    } catch (err) {
      // Log error details for debugging
      console.error("Dashboard API error:", {
        message: err instanceof Error ? err.message : String(err),
        error: err,
        timestamp: new Date().toISOString(),
      });

      // Set user-friendly error message
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to load dashboard. Please try refreshing.';
      
      setError(errorMessage);
      
      // CRITICAL: Always set default stats so dashboard renders
      // Even with API failure, user sees the page structure
      setStats(DEFAULT_STATS);
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

  // Use only the primitive values from stats
  const eventsCount = stats.totalEvents ?? 0;
  const participantsCount = stats.totalParticipants ?? 0;
  const noShowsCount = stats.totalNoShows ?? 0;
  const blocklistedCount = stats.totalBlocklisted ?? 0;

  // CRITICAL: Always render dashboard, even with empty state
  // This prevents white screens on deployment
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Real-time system overview</p>
        </div>
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={loadDashboardData}
          disabled={loading}
          title={loading ? "Loading..." : "Refresh dashboard data"}
        >
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {/* Error Alert - Only show if error exists */}
      {error && (
        <div className="alert alert-warning" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Dashboard Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Stats Grid - Always rendered with safe values */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Calendar size={24} /></div>
          <div className="stat-content">
            <h3>Events</h3>
            <p className="stat-value">{eventsCount}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-content">
            <h3>Participants</h3>
            <p className="stat-value">{participantsCount}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><AlertCircle size={24} /></div>
          <div className="stat-content">
            <h3>No-Shows</h3>
            <p className="stat-value">{noShowsCount}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Ban size={24} /></div>
          <div className="stat-content">
            <h3>Blocklisted</h3>
            <p className="stat-value">{blocklistedCount}</p>
          </div>
        </div>
      </div>

      {/* Quick Access Navigation - Always available */}
      <div className="quick-actions">
        <h2>Quick Access</h2>
        <div className="actions-grid">
          <a href="/events" className="action-card" title="Go to Events">
            <Calendar size={24} />
            <h4>Events</h4>
          </a>
          <a href="/participants" className="action-card" title="Go to Participants">
            <Users size={24} />
            <h4>Participants</h4>
          </a>
          <a href="/no-shows" className="action-card" title="Go to No-Shows">
            <AlertCircle size={24} />
            <h4>No-Shows</h4>
          </a>
          <a href="/blocklist" className="action-card" title="Go to Blocklist">
            <Ban size={24} />
            <h4>Blocklist</h4>
          </a>
        </div>
      </div>

      {/* Status Info - Show when data is incomplete */}
      {error && (
        <div className="dashboard-status" style={{ marginTop: '30px', padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(0, 217, 255, 0.05)', border: '1px solid rgba(0, 217, 255, 0.2)', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Tip:</strong> Click "Refresh" to reload dashboard data from the server.
          </p>
          <p style={{ margin: 0 }}>
            If problems persist, check your network connection and ensure the backend server is running.
          </p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
