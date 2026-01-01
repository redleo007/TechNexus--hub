import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

interface NavLink {
  path: string;
  label: string;
  icon: string;
}

const navLinks: NavLink[] = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/import', label: 'Import & Attendance', icon: '📥' },
  { path: '/events', label: 'Events', icon: '📅' },
  { path: '/events-history', label: 'Events History', icon: '📜' },
  { path: '/no-shows', label: 'No-Shows', icon: '❌' },
  { path: '/blocklist', label: 'Blocklist', icon: '🚫' },
  { path: '/volunteers', label: 'Volunteers', icon: '👥' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

interface NavbarProps {
  onLogout: () => void;
}

export function Navbar({ onLogout }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const location = useLocation();

  useEffect(() => {
    const user = localStorage.getItem('admin_user');
    if (user) {
      setAdminUser(user);
    }
  }, []);

  const handleLogout = () => {
    onLogout();
    setIsOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <img src="/logo.svg" alt="TechNexus Logo" className="brand-icon" />
          <span className="brand-text">TechNexus</span>
        </Link>
        
        <button 
          className="navbar-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          ☰
        </button>

        <ul className={`navbar-menu ${isOpen ? 'active' : ''}`}>
          {navLinks.map((link) => (
            <li key={link.path} className="nav-item">
              <Link
                to={link.path}
                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <span className="nav-icon">{link.icon}</span>
                <span className="nav-label">{link.label}</span>
              </Link>
            </li>
          ))}
          <li className="nav-item nav-divider"></li>
          <li className="nav-item admin-section">
            <div className="admin-info">
              <span className="admin-avatar">👤</span>
              <span className="admin-name">{adminUser}</span>
            </div>
            <button 
              className="logout-btn"
              onClick={handleLogout}
              title="Logout"
            >
              🚪
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export function Layout({ children, onLogout }: LayoutProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="layout">
      <Navbar onLogout={onLogout} />
      <main className={`main-content ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          {children}
        </div>
      </main>
      <footer className="footer">
        <p>&copy; 2025 TechNexus. Production-Ready Event Management System.</p>
      </footer>
    </div>
  );
}
