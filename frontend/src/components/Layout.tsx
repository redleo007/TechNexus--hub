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
          <span className="brand-icon">
            <svg viewBox="0 0 64 64" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Top center person - blue */}
              <circle cx="32" cy="8" r="4" fill="#4A90E2"/>
              <path d="M32 12 Q28 16 28 20 Q28 22 32 22 Q36 22 36 20 Q36 16 32 12" fill="#4A90E2"/>
              
              {/* Top right person - green */}
              <circle cx="48" cy="14" r="4" fill="#7ED321"/>
              <path d="M48 18 Q44 22 44 26 Q44 28 48 28 Q52 28 52 26 Q52 22 48 18" fill="#7ED321"/>
              
              {/* Middle right person - yellow */}
              <circle cx="54" cy="32" r="4" fill="#F5D547"/>
              <path d="M54 36 Q50 40 50 44 Q50 46 54 46 Q58 46 58 44 Q58 40 54 36" fill="#F5D547"/>
              
              {/* Bottom right person - orange */}
              <circle cx="44" cy="50" r="4" fill="#FF9500"/>
              <path d="M44 54 Q40 58 40 62 Q40 64 44 64 Q48 64 48 62 Q48 58 44 54" fill="#FF9500"/>
              
              {/* Bottom center person - red */}
              <circle cx="32" cy="56" r="4" fill="#E74C3C"/>
              <path d="M32 60 Q28 64 28 68 Q28 70 32 70 Q36 70 36 68 Q36 64 32 60" fill="#E74C3C"/>
              
              {/* Bottom left person - pink/magenta */}
              <circle cx="20" cy="50" r="4" fill="#E85D75"/>
              <path d="M20 54 Q16 58 16 62 Q16 64 20 64 Q24 64 24 62 Q24 58 20 54" fill="#E85D75"/>
              
              {/* Middle left person - cyan */}
              <circle cx="10" cy="32" r="4" fill="#2BCDCD"/>
              <path d="M10 36 Q6 40 6 44 Q6 46 10 46 Q14 46 14 44 Q14 40 10 36" fill="#2BCDCD"/>
              
              {/* Top left person - light blue */}
              <circle cx="16" cy="14" r="4" fill="#5DADE2"/>
              <path d="M16 18 Q12 22 12 26 Q12 28 16 28 Q20 28 20 26 Q20 22 16 18" fill="#5DADE2"/>
              
              {/* Center circle connector */}
              <circle cx="32" cy="32" r="8" fill="none" stroke="#00D9FF" strokeWidth="1.5" opacity="0.3"/>
            </svg>
          </span>
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
