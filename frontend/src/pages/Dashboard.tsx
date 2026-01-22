import { useEffect, useState } from "react";
import { Calendar, Users, AlertCircle, Ban, RefreshCcw, AlertTriangle } from "lucide-react";
import { dashboardAPI } from "../api/client";
import "./Dashboard.css";

/**
 * SAFE DASHBOARD MODEL - PRIMITIVES ONLY
 * All fields are guaranteed to be primitive types or null
 * NEVER contains objects that would trigger React error #31
 */
interface DashboardModel {
  // Top-level statistics (primitives only)
  totalEvents: number;
  totalParticipants: number;
  totalNoShows: number;
  totalBlocklisted: number;
  
  // Latest event with attendance breakdown (primitives only)
  latestEvent: {
    id: string;
    name: string;
    date: string;
    totalRegistered: number;
    attended: number;
    noShows: number;
    attendanceRate: number; // 0-100
  } | null;
}

/**
 * DEFAULT DASHBOARD STATE
 * Ensures dashboard renders safely even if API fails
 * All values are primitives - safe for JSX rendering
 */
const DEFAULT_DASHBOARD: DashboardModel = {
  totalEvents: 0,
  totalParticipants: 0,
  totalNoShows: 0,
  totalBlocklisted: 0,
  latestEvent: null,
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
 * SAFE STRING EXTRACTION
 * Always returns a string or fallback value
 */
const safeString = (value: any, fallback: string = ""): string => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
};

/**
 * MAP BACKEND RESPONSE TO SAFE DASHBOARD MODEL
 * 
 * Extracts ONLY what we need:
 * - totalEvents (primitive number)
 * - activeParticipants → totalParticipants (primitive number)
 * - noShows (handle as number or object.total)
 * - blocklistedParticipants (primitive number)
 * - Strip ALL unused fields (uniqueParticipants, byParticipant, etc)
 * 
 * Result: Pure primitive values, safe for React JSX
 */
const mapBackendToDashboard = (response: any): DashboardModel => {
  try {
    // Guard: response is an object
    if (!response || typeof response !== 'object') {
      console.warn('[Dashboard] Invalid response type:', typeof response);
      return DEFAULT_DASHBOARD;
    }

    // Extract data from axios response wrapper or direct response
    const data = response?.data ?? response;

    // Guard: data is an object
    if (typeof data !== 'object' || data === null) {
      console.warn('[Dashboard] Invalid data object');
      return DEFAULT_DASHBOARD;
    }

    // Map backend fields to dashboard model (PRIMITIVES ONLY)
    const dashboard: DashboardModel = {
      totalEvents: safeNumber(data.totalEvents, 0),
      totalParticipants: safeNumber(data.activeParticipants, 0),
      totalNoShows: safeNumber(data.noShows, 0), // Handles both number and { total: X, ... }
      totalBlocklisted: safeNumber(data.blocklistedParticipants, 0),
      latestEvent: null, // Will be computed if events data is available
    };

    // Extract latest event if available (e.g., from events array)
    if (Array.isArray(data.events) && data.events.length > 0) {
      const latest = data.events[0]; // Assuming backend returns sorted by date desc
      if (latest && typeof latest === 'object') {
        dashboard.latestEvent = {
          id: safeString(latest.id, ''),
          name: safeString(latest.name, 'Untitled Event'),
          date: safeString(latest.date, '-'),
          totalRegistered: safeNumber(latest.totalRegistered || latest.total_registered, 0),
          attended: safeNumber(latest.attended, 0),
          noShows: safeNumber(latest.noShows || latest.no_shows, 0),
          attendanceRate: Math.round(
            safeNumber(latest.attended, 0) / Math.max(safeNumber(latest.totalRegistered || latest.total_registered, 1), 1) * 100
          ),
        };
      }
    }

    return dashboard;
  } catch (error) {
    console.error('[Dashboard] Error mapping response:', error);
    return DEFAULT_DASHBOARD;
  }
};

export function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardModel>(DEFAULT_DASHBOARD);
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
        response = await dashboardAPI.getStats();
        clearTimeout(timeoutId);
      } catch (timeoutError) {
        clearTimeout(timeoutId);
        throw new Error('Dashboard API request timed out');
      }

      // Map backend response to safe dashboard model
      const mappedDashboard = mapBackendToDashboard(response);
      setDashboard(mappedDashboard);
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
      setDashboard(DEFAULT_DASHBOARD);
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
            <p className="stat-value">{dashboard?.totalEvents ?? 0}</p>
          </div>
        </div>

        {/* Total Participants */}
        <div className="stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-content">
            <h3>Participants</h3>
            <p className="stat-value">{dashboard?.totalParticipants ?? 0}</p>
          </div>
        </div>

        {/* Total No-Shows */}
        <div className="stat-card">
          <div className="stat-icon"><AlertCircle size={24} /></div>
          <div className="stat-content">
            <h3>No-Shows</h3>
            <p className="stat-value">{dashboard?.totalNoShows ?? 0}</p>
          </div>
        </div>

        {/* Total Blocklisted */}
        <div className="stat-card">
          <div className="stat-icon"><Ban size={24} /></div>
          <div className="stat-content">
            <h3>Blocklisted</h3>
            <p className="stat-value">{dashboard?.totalBlocklisted ?? 0}</p>
          </div>
        </div>
      </div>

      {/* LATEST EVENT SECTION - Only show if data exists */}
      {dashboard?.latestEvent && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ marginBottom: '20px' }}>Latest Event</h2>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              {/* Event Details */}
              <div>
                <h3>{dashboard.latestEvent.name ?? "Untitled Event"}</h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
                  📅 {dashboard.latestEvent.date ?? "-"}
                </p>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                  🆔 {dashboard.latestEvent.id ?? "-"}
                </p>
              </div>

              {/* Attendance Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ padding: '15px', backgroundColor: 'rgba(0, 217, 255, 0.1)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '5px' }}>Total Registered</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{dashboard.latestEvent.totalRegistered ?? 0}</div>
                </div>

                <div style={{ padding: '15px', backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '5px' }}>Attended</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>{dashboard.latestEvent.attended ?? 0}</div>
                </div>

                <div style={{ padding: '15px', backgroundColor: 'rgba(244, 67, 54, 0.1)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '5px' }}>No-Shows</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#F44336' }}>{dashboard.latestEvent.noShows ?? 0}</div>
                </div>

                <div style={{ padding: '15px', backgroundColor: 'rgba(33, 150, 243, 0.1)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '5px' }}>Attendance Rate</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2196F3' }}>{dashboard.latestEvent.attendanceRate ?? 0}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
