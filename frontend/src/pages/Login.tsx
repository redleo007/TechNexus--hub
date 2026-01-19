import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
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
              <img src="/logo.svg" alt="TechNexus Logo" className="brand-icon" />
              <span className="brand-name">TechNexus Community</span>
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
                <span className="alert-icon"><AlertTriangle size={20} /></span>
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
