import { useEffect, useState } from "react";
import { Calendar, Users, AlertCircle, Ban, RefreshCcw, AlertTriangle } from "lucide-react";
import { dashboardAPI } from "../api/client";
import "./Dashboard.css";

interface DashboardStats {
  totalEvents?: number;
  activeParticipants?: number;
  blocklistedParticipants?: number;
  noShows?: number;
  events?: number;
  participants?: number;
  blocklisted?: number;
}

// Default fallback stats to ensure dashboard always has valid data
const DEFAULT_STATS: Required<DashboardStats> = {
  totalEvents: 0,
  activeParticipants: 0,
  blocklistedParticipants: 0,
  noShows: 0,
  events: 0,
  participants: 0,
  blocklisted: 0,
};

/**
 * Safely extract stats from API response
 * Handles multiple response formats and validates data
 */
const extractStatsFromResponse = (response: any): DashboardStats => {
  try {
    // Guard: response exists and is object
    if (!response || typeof response !== 'object') {
      console.warn('Invalid response type:', typeof response);
      return DEFAULT_STATS;
    }

    // Extract data from axios response wrapper
    const data = response?.data ?? response;

    // Guard: data is object
    if (typeof data !== 'object' || data === null) {
      console.warn('Invalid data type:', typeof data);
      return DEFAULT_STATS;
    }

    // Safely extract numeric fields with fallback
    const stats: DashboardStats = {
      totalEvents: Number.isInteger(data?.totalEvents) ? data.totalEvents : 0,
      activeParticipants: Number.isInteger(data?.activeParticipants) ? data.activeParticipants : 0,
      blocklistedParticipants: Number.isInteger(data?.blocklistedParticipants) ? data.blocklistedParticipants : 0,
      noShows: Number.isInteger(data?.noShows) ? data.noShows : 0,
      events: Number.isInteger(data?.events) ? data.events : 0,
      participants: Number.isInteger(data?.participants) ? data.participants : 0,
      blocklisted: Number.isInteger(data?.blocklisted) ? data.blocklisted : 0,
    };

    return stats;
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
        response = await dashboardAPI.getStats();
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

  // Get safe stat values with full fallback chain
  const getStatValue = (primary?: number, secondary?: number): number => {
    if (typeof primary === 'number' && Number.isInteger(primary) && primary >= 0) return primary;
    if (typeof secondary === 'number' && Number.isInteger(secondary) && secondary >= 0) return secondary;
    return 0;
  };

  const eventsCount = getStatValue(stats?.totalEvents, stats?.events);
  const participantsCount = getStatValue(stats?.activeParticipants, stats?.participants);
  const noShowsCount = getStatValue(stats?.noShows);
  const blocklistedCount = getStatValue(stats?.blocklistedParticipants, stats?.blocklisted);

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
