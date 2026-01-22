import { useEffect, useState } from "react";
import { Calendar, Users, AlertCircle, Ban, RefreshCcw, AlertTriangle } from "lucide-react";
import { dashboardAPI } from "../api/client";
import "./Dashboard.css";

/**
 * SAFE DASHBOARD MODEL - PRIMITIVES ONLY
 * All fields are guaranteed to be primitive types
 * NEVER contains objects that would trigger React error #31
 */
interface DashboardStats {
  totalEvents: number;
  totalParticipants: number;
  totalNoShows: number;
  totalBlocklisted: number;
}

/**
 * DEFAULT DASHBOARD STATE
 * Ensures dashboard renders safely even if API fails
 * All values are primitives - safe for JSX rendering
 */
const DEFAULT_STATS: DashboardStats = {
  totalEvents: 0,
  totalParticipants: 0,
  totalNoShows: 0,
  totalBlocklisted: 0,
};

/**
 * SAFE NUMBER EXTRACTION
 * Handles:
 * - Direct numbers: 42
 * - Nested objects: { total: 42, uniqueParticipants: 5, byParticipant: [...] }
 * - Invalid/missing values: returns fallback
 * 
 * CRITICAL: Never returns objects - always primitives
 */
const safeNumber = (value: any, fallback: number = 0): number => {
  // Already a valid number
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }

  // Object with .total property (e.g., { total, uniqueParticipants, byParticipant })
  if (value && typeof value === 'object' && 'total' in value) {
    const total = value.total;
    if (typeof total === 'number' && Number.isInteger(total) && total >= 0) {
      return total;
    }
  }

  return fallback;
};

/**
 * MAP BACKEND RESPONSE TO SAFE DASHBOARD MODEL
 * Extracts ONLY what we need, stripping unused fields
 * Result: Pure primitive values, safe for React JSX
 */
const mapBackendToDashboard = (response: any): DashboardStats => {
  try {
    // Guard: response is an object
    if (!response || typeof response !== 'object') {
      console.warn('[Dashboard] Invalid response type:', typeof response);
      return DEFAULT_STATS;
    }

    // Extract data from axios response wrapper or direct response
    const data = response?.data ?? response;

    // Guard: data is an object
    if (typeof data !== 'object' || data === null) {
      console.warn('[Dashboard] Invalid data object');
      return DEFAULT_STATS;
    }

    // Map backend fields to dashboard model (PRIMITIVES ONLY)
    const stats: DashboardStats = {
      totalEvents: safeNumber(data.totalEvents, 0),
      totalParticipants: safeNumber(data.activeParticipants ?? data.totalParticipants, 0),
      totalNoShows: safeNumber(data.noShows, 0),
      totalBlocklisted: safeNumber(data.blocklistedParticipants, 0),
    };

    return stats;
  } catch (error) {
    console.error('[Dashboard] Error mapping response:', error);
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

  /**
   * LOAD DASHBOARD DATA - Single API Call
   * Fetches complete overview with one request
   * Fails gracefully with default data if API is down
   */
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Single API call with timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let response;
      try {
        // Try /api/dashboard/stats (preferred endpoint)
        response = await dashboardAPI.getStats();
        clearTimeout(timeoutId);
      } catch (timeoutError) {
        clearTimeout(timeoutId);
        throw new Error('Dashboard API request timed out');
      }

      // Map backend response to safe dashboard model
      const mappedStats = mapBackendToDashboard(response);
      setStats(mappedStats);
      setError(null);
    } catch (err) {
      // Log error for debugging
      console.error("[Dashboard] Failed to load data:", {
        message: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      });

      // Show user-friendly error
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to load dashboard. Please refresh to try again.';
      setError(errorMessage);

      // CRITICAL: Still show dashboard with defaults
      // This prevents white screen even when API fails
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  };

  // LOADING STATE
  if (loading) {
    return (
      <div className="dashboard loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // RENDER DASHBOARD
  return (
    <div className="dashboard">
      {/* HEADER */}
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

      {/* ERROR ALERT */}
      {error && (
        <div className="alert alert-warning" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Dashboard Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* MAIN STATS GRID - All values are primitives (numbers/strings only) */}
      <div className="stats-grid">
        {/* Total Events */}
        <div className="stat-card">
          <div className="stat-icon"><Calendar size={24} /></div>
          <div className="stat-content">
            <h3>Events</h3>
            <p className="stat-value">{stats?.totalEvents ?? 0}</p>
          </div>
        </div>

        {/* Total Participants */}
        <div className="stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-content">
            <h3>Participants</h3>
            <p className="stat-value">{stats?.totalParticipants ?? 0}</p>
          </div>
        </div>

        {/* Total No-Shows */}
        <div className="stat-card">
          <div className="stat-icon"><AlertCircle size={24} /></div>
          <div className="stat-content">
            <h3>No-Shows</h3>
            <p className="stat-value">{stats?.totalNoShows ?? 0}</p>
          </div>
        </div>

        {/* Total Blocklisted */}
        <div className="stat-card">
          <div className="stat-icon"><Ban size={24} /></div>
          <div className="stat-content">
            <h3>Blocklisted</h3>
            <p className="stat-value">{stats?.totalBlocklisted ?? 0}</p>
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

      {/* Status Info - Show when error */}
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
