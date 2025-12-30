import { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLoginSuccess: (username: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Admin credentials validation
      if (username === 'admin' && password === 'admin123') {
        // Store auth in localStorage
        localStorage.setItem('auth_token', 'admin_' + Date.now());
        localStorage.setItem('admin_user', username);
        onLoginSuccess(username);
      } else {
        setError('Invalid credentials. Admin access only.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <div className="login-brand">
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
              <span className="brand-name">TechNexus</span>
            </div>
            <h1>Admin Login</h1>
            <p>Event & Attendance Management System</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                disabled={loading}
                required
              />
            </div>

            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠️</span>
                <span className="alert-text">{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

         
        </div>

        <div className="login-background">
          <div className="bg-element bg-1"></div>
          <div className="bg-element bg-2"></div>
          <div className="bg-element bg-3"></div>
        </div>
      </div>
    </div>
  );
}
