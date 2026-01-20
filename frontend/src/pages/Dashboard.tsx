import { useEffect, useState } from 'react';
import {
  Calendar,
  Users,
  AlertCircle,
  Ban,
  BarChart3,
  CheckCircle,
  RefreshCcw,
  Settings,
} from 'lucide-react';
import { dashboardAPI, eventsAPI, participantsAPI, blocklistAPI, attendanceAPI } from '../api/client';
import { useAsync } from '../utils/hooks';
import { formatDateTime, formatDate } from '../utils/formatters';
import './Dashboard.css';

interface DashboardStats {
  totalEvents: number;
  activeParticipants: number;
  blocklistedParticipants: number;
  noShows: number;
  recentActivities: any[];
}

interface Event {
  id: string;
  name: string;
  date: string;
}

interface Participant {
  id: string;
  name: string;
  is_blocklisted: boolean;
}

interface AttendanceRecord {
  id: string;
  participant_id: string;
  status: 'attended' | 'no_show' | 'not_attended';
}

export function Dashboard() {
  const [latestEventStats, setLatestEventStats] = useState<any>(null);

  useEffect(() => {
    document.title = 'Dashboard - TechNexus Community';
  }, []);

  const { data: stats, loading, error, refetch } = useAsync<DashboardStats>(
    () => dashboardAPI.getStats().then((res) => res.data),
    true
  );

  const { data: events } = useAsync<Event[]>(
    () => eventsAPI.getAll().then((res) => res.data),
    true
  );

  const { data: participants } = useAsync<Participant[]>(
    () => participantsAPI.getAll(false).then((res) => res.data),
    true
  );

  const { data: blocklist } = useAsync(
    () => blocklistAPI.getAll().then((res) => res.data),
    true
  );

  // Load latest event attendance
  useEffect(() => {
    const loadLatestEventAttendance = async () => {
      if (!events || events.length === 0) return;
      
      // Get latest event
      const latestEvent = events.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];

      if (!latestEvent) return;

      try {
        const attendance = await attendanceAPI.getByEvent(latestEvent.id);
        const records = attendance.data || [];

        const attended = records.filter((r: AttendanceRecord) => r.status === 'attended').length;
        const noShow = records.filter((r: AttendanceRecord) => r.status === 'no_show' || r.status === 'not_attended').length;

        setLatestEventStats({
          event: latestEvent,
          total: records.length,
          attended,
          noShow,
          rate: records.length > 0 ? Math.round((attended / records.length) * 100) : 0,
        });
      } catch (error) {
        console.error('Failed to load latest event attendance:', error);
      }
    };

    loadLatestEventAttendance();
  }, [events]);

  useEffect(() => {
    const interval = setInterval(refetch, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [refetch]);

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
      <div className="dashboard error-container">
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
        <button className="btn btn-primary" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  const getActivityIcon = (type: string): React.ReactNode => {
    switch (type) {
      case 'event_created':
        return <Calendar size={18} />;
      case 'event_updated':
        return <Calendar size={18} />;
      case 'attendance_marked':
        return <CheckCircle size={18} />;
      case 'participant_auto_blocked':
        return <Ban size={18} />;
      case 'participant_unblocked':
        return <Users size={18} />;
      default:
        return <BarChart3 size={18} />;
    }
  };

  const activeParticipants = participants?.filter(p => !p.is_blocklisted).length || 0;
  const totalParticipants = participants?.length || 0;
  const attendanceRate = totalParticipants > 0 
    ? Math.round(((totalParticipants - (stats?.noShows || 0)) / totalParticipants) * 100)
    : 0;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Real-time system overview and activity tracking</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={refetch}>
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      {/* Primary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Calendar size={24} /></div>
          <div className="stat-content">
            <h3>Events</h3>
            <p className="stat-value">{stats?.totalEvents || 0}</p>
            <p className="stat-label">{events?.length || 0} total events</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-content">
            <h3>Participants</h3>
            <p className="stat-value">{activeParticipants}</p>
            <p className="stat-label">{totalParticipants} total registered</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><AlertCircle size={24} /></div>
          <div className="stat-content">
            <h3>No-Shows</h3>
            <p className="stat-value">{stats?.noShows || 0}</p>
            <p className="stat-label">Attendance: {attendanceRate}%</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Ban size={24} /></div>
          <div className="stat-content">
            <h3>Blocklisted</h3>
            <p className="stat-value">{stats?.blocklistedParticipants || 0}</p>
            <p className="stat-label">{blocklist?.length || 0} on blocklist</p>
          </div>
        </div>
      </div>

      {/* Latest Event Overview */}
      {latestEventStats && (
        <div className="latest-event-section">
          <div className="section-header">
            <div>
              <h2>Latest Event Overview</h2>
              <p className="event-name">{latestEventStats.event.name}</p>
            </div>
          </div>

          <div className="event-stats-grid">
            <div className="event-stat-card">
              <div className="event-stat-icon"><Calendar size={20} /></div>
              <div className="event-stat-content">
                <span className="label">Date</span>
                <span className="value">{formatDate(latestEventStats.event.date)}</span>
              </div>
            </div>

            <div className="event-stat-card">
              <div className="event-stat-icon"><Users size={20} /></div>
              <div className="event-stat-content">
                <span className="label">Total Registered</span>
                <span className="value">{latestEventStats.total}</span>
              </div>
            </div>

            <div className="event-stat-card">
              <div className="event-stat-icon"><CheckCircle size={20} /></div>
              <div className="event-stat-content">
                <span className="label">Attended</span>
                <span className="value">{latestEventStats.attended}</span>
              </div>
            </div>

            <div className="event-stat-card">
              <div className="event-stat-icon"><AlertCircle size={20} /></div>
              <div className="event-stat-content">
                <span className="label">No-Shows</span>
                <span className="value">{latestEventStats.noShow}</span>
              </div>
            </div>

            <div className="event-stat-card">
              <div className="event-stat-icon"><BarChart3 size={20} /></div>
              <div className="event-stat-content">
                <span className="label">Attendance Rate</span>
                <span className="value">{latestEventStats.rate}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="activities-section">
        <div className="section-header">
          <h2>Recent Activity</h2>
          <button className="btn btn-secondary btn-sm" onClick={refetch}>
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>

        {stats?.recentActivities && stats.recentActivities.length > 0 ? (
          <div className="activity-feed">
            {stats.recentActivities.slice(0, 10).map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="activity-content">
                  <h4>{formatActivityType(activity.type)}</h4>
                  <p>{activity.details}</p>
                  <time>{formatDateTime(activity.created_at)}</time>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No recent activities</p>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <a href="/events" className="action-card">
            <div className="action-icon"><Calendar size={24} /></div>
            <div className="action-text">
              <h4>Manage Events</h4>
              <p>{events?.length || 0} events</p>
            </div>
          </a>
          <a href="/events-history" className="action-card">
            <div className="action-icon"><BarChart3 size={24} /></div>
            <div className="action-text">
              <h4>Events History</h4>
              <p>View event details</p>
            </div>
          </a>
          <a href="/import-attendance" className="action-card">
            <div className="action-icon"><RefreshCcw size={24} /></div>
            <div className="action-text">
              <h4>Import Data</h4>
              <p>Participants & Attendance</p>
            </div>
          </a>
          <a href="/no-shows" className="action-card">
            <div className="action-icon"><AlertCircle size={24} /></div>
            <div className="action-text">
              <h4>No-Shows</h4>
              <p>{stats?.noShows || 0} records</p>
            </div>
          </a>
          <a href="/blocklist" className="action-card">
            <div className="action-icon"><Ban size={24} /></div>
            <div className="action-text">
              <h4>Blocklist</h4>
              <p>{stats?.blocklistedParticipants || 0} users</p>
            </div>
          </a>
          <a href="/settings" className="action-card">
            <div className="action-icon"><Settings size={24} /></div>
            <div className="action-text">
              <h4>Settings</h4>
              <p>System configuration</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

function formatActivityType(type: string): string {
  const types: { [key: string]: string } = {
    event_created: 'Event Created',
    event_updated: 'Event Updated',
    attendance_marked: 'Attendance Marked',
    participant_auto_blocked: 'Participant Auto-Blocked',
    participant_unblocked: 'Participant Unblocked',
  };
  return types[type] || 'Activity';
}
