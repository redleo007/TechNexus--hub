import { useEffect, useState, useCallback, useRef } from "react";
import { dashboardAPI } from "../api/client";
import { Icon } from "../components/Icon";
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

// Simple in-memory cache for instant subsequent loads
let statsCache: { data: DashboardStats; timestamp: number } | null = null;
const CACHE_TTL = 10000; // 10 seconds

type RecentEvent = {
  title: string;
  date?: string | null;
  lastActivity?: string | null;
  stats?: {
    participants: number;
    attendance: number;
    noShows: number;
    blocklisted: number;
  };
};

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(() => statsCache?.data ?? DEFAULT_STATS);
  const [loading, setLoading] = useState(!statsCache);
  const [error, setError] = useState<string | null>(null);
  const [recentEvent, setRecentEvent] = useState<RecentEvent | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /**
   * LOAD DASHBOARD DATA - Single fast API Call with caching
   * Uses /stats endpoint only (fastest, ~50ms)
   * Falls back to cache if available
   */
  const loadDashboardData = useCallback(async (showLoader: boolean = true, forceRefresh: boolean = false) => {
    // Return cached data immediately if valid and not forcing refresh
    if (!forceRefresh && statsCache && Date.now() - statsCache.timestamp < CACHE_TTL) {
      setStats(statsCache.data);
      setLoading(false);
      return;
    }

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    if (showLoader && !statsCache) setLoading(true);
    
    try {
      // Single fast endpoint - /stats is optimized for speed
      const response = await dashboardAPI.getStats();
      const data = response?.data ?? response;

      const nextStats: DashboardStats = {
        totalEvents: data?.totalEvents ?? data?.events ?? 0,
        totalParticipants: data?.activeParticipants ?? data?.participants ?? 0,
        totalNoShows: typeof data?.noShows === 'object' ? data.noShows.total : (data?.noShows ?? 0),
        totalBlocklisted: data?.blocklistedParticipants ?? data?.blocklisted ?? 0,
      };

      // Update cache
      statsCache = { data: nextStats, timestamp: Date.now() };
      
      setStats(nextStats);
      setError(null);

      // Fetch overview data in background (non-blocking) for recent event
      dashboardAPI.getOverview().then((overviewRes) => {
        const overview = overviewRes?.data ?? overviewRes;
        const lastEvent = overview?.lastEvent;
        if (lastEvent) {
          setRecentEvent({
            title: lastEvent.name,
            date: lastEvent.date,
            lastActivity: overview?.lastUpdated,
            stats: {
              participants: lastEvent.participantCount ?? 0,
              attendance: lastEvent.attendanceCount ?? 0,
              noShows: lastEvent.noShowCount ?? 0,
              blocklisted: lastEvent.blocklistedInEvent ?? 0,
            },
          });
        }
      }).catch(() => { /* ignore background fetch errors */ });

    } catch (err) {
      // Use cache on error if available
      if (statsCache) {
        setStats(statsCache.data);
        console.warn('[Dashboard] Using cached data due to error');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard';
        setError(errorMessage);
        setStats(DEFAULT_STATS);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Dashboard - TechNexus Community";
    loadDashboardData(true, false);

    // Auto-refresh every 30s (reduced frequency for performance)
    const timer = setInterval(() => {
      loadDashboardData(false, true);
    }, 30000);

    return () => {
      clearInterval(timer);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadDashboardData]);

  // RENDER DASHBOARD - Show skeleton placeholders during initial load
  const showSkeleton = loading && !statsCache;

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
          onClick={() => loadDashboardData(true, true)}
          disabled={loading}
          title={loading ? "Loading..." : "Refresh dashboard data"}
        >
          <Icon alt="Refresh" name="refresh" /> {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="alert alert-warning" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon alt="Warning" name="warning" sizePx={18} />
          <div>
            <strong>Dashboard Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* MAIN STATS GRID - Show skeleton or actual values */}
      <div className="stats-grid">
        {/* Total Events */}
        <div className="stat-card">
          <div className="stat-icon"><Icon alt="Events" name="events" /></div>
          <div className="stat-content">
            <h3>Events</h3>
            <p className={`stat-value ${showSkeleton ? 'skeleton' : ''}`}>
              {showSkeleton ? '' : (stats?.totalEvents ?? 0)}
            </p>
          </div>
        </div>

        {/* Total Participants */}
        <div className="stat-card">
          <div className="stat-icon"><Icon alt="Participants" name="participants" /></div>
          <div className="stat-content">
            <h3>Participants</h3>
            <p className={`stat-value ${showSkeleton ? 'skeleton' : ''}`}>
              {showSkeleton ? '' : (stats?.totalParticipants ?? 0)}
            </p>
          </div>
        </div>

        {/* Total No-Shows */}
        <div className="stat-card">
          <div className="stat-icon"><Icon alt="No-Shows" name="noShows" /></div>
          <div className="stat-content">
            <h3>No-Shows</h3>
            <p className={`stat-value ${showSkeleton ? 'skeleton' : ''}`}>
              {showSkeleton ? '' : (stats?.totalNoShows ?? 0)}
            </p>
          </div>
        </div>

        {/* Total Blocklisted */}
        <div className="stat-card">
          <div className="stat-icon"><Icon alt="Blocklisted" name="blocklist" /></div>
          <div className="stat-content">
            <h3>Blocklisted</h3>
            <p className={`stat-value ${showSkeleton ? 'skeleton' : ''}`}>
              {showSkeleton ? '' : (stats?.totalBlocklisted ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Event Overview */}
      <div className="recent-event-card">
        <div className="recent-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon alt="Recent" name="clock" />
            <h2 style={{ margin: 0 }}>Recent Event</h2>
          </div>
          <span className="recent-updated">
            {recentEvent?.lastActivity ? new Date(recentEvent.lastActivity).toLocaleString() : 'No activity yet'}
          </span>
        </div>
        {recentEvent ? (
          <div className="recent-body">
            <div>
              <p className="recent-title">{recentEvent.title}</p>
              <p className="recent-date">{recentEvent.date ? new Date(recentEvent.date).toLocaleDateString() : '—'}</p>
            </div>
            <div className="recent-stats">
              <div className="recent-stat">
                <span className="label">Participants</span>
                <span className="value">{recentEvent.stats?.participants ?? 0}</span>
              </div>
              <div className="recent-stat">
                <span className="label">Attendance</span>
                <span className="value">{recentEvent.stats?.attendance ?? 0}</span>
              </div>
              <div className="recent-stat">
                <span className="label">No-Shows</span>
                <span className="value">{recentEvent.stats?.noShows ?? 0}</span>
              </div>
              <div className="recent-stat">
                <span className="label">Blocklisted</span>
                <span className="value">{recentEvent.stats?.blocklisted ?? 0}</span>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => loadDashboardData(true)} disabled={loading}>
              <Icon alt="Refresh" name="refresh" /> Refresh
            </button>
          </div>
        ) : (
          <div className="recent-body" style={{ justifyContent: 'space-between' }}>
            <p className="recent-title">No recent activity</p>
            <button className="btn btn-secondary btn-sm" onClick={() => loadDashboardData(true)} disabled={loading}>
              <Icon alt="Refresh" name="refresh" /> Refresh
            </button>
          </div>
        )}
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
