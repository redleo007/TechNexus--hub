import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  History,
  Upload,
  Ban,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { Navbar } from './Navbar';
import './Layout.css';

interface NavLink {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const mainNavLinks: NavLink[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { path: '/events', label: 'Events', icon: <Calendar size={20} /> },
  { path: '/events-history', label: 'Events History', icon: <History size={20} /> },
  { path: '/import-attendance', label: 'Import & Attendance', icon: <Upload size={20} /> },
  { path: '/blocklist', label: 'Blocklist', icon: <Ban size={20} /> },
  { path: '/no-shows', label: 'No Shows', icon: <AlertCircle size={20} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, isCollapsed, onClose }: SidebarProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'open' : ''}`}>
        {/* Navigation Only */}
        <nav className="sidebar-nav">
          {mainNavLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`sidebar-link ${isActive(link.path) ? 'active' : ''}`}
              title={isCollapsed ? link.label : ''}
              onClick={onClose}
            >
              <span className="sidebar-icon">{link.icon}</span>
              {!isCollapsed && <span className="sidebar-label">{link.label}</span>}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export function Layout({ children, onLogout }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarToggle = () => {
    // On desktop: toggle collapse/expand
    // On mobile: toggle open/close
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="layout-container">
      <Navbar onLogout={onLogout} onSidebarToggle={handleSidebarToggle} />
      <div className="layout-main">
        <Sidebar isOpen={sidebarOpen} isCollapsed={sidebarCollapsed} onClose={handleSidebarClose} />
        <main className="main-content">
          <div className="container">
            {children}
          </div>
          <footer className="footer">
            <p>&copy; 2025 TechNexus Community. Production-Ready Event Management System.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
