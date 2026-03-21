import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function ForgotPassword() {
  const [username, setUsername] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.post('/api/auth/reset-password', { username, accountNo, newPassword });
      setMessage('Password reset successfully. You can now login.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', zIndex: 10 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 className="text-gradient">Reset Password</h1>
        <p className="text-muted">Verify your details to reset</p>
      </div>

      {error && <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem' }}>{error}</div>}
      {message && <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', borderRadius: '8px', fontSize: '0.875rem' }}>{message}</div>}

      <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Username</label>
          <input type="text" className="glass-input" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Account Number</label>
          <input type="text" className="glass-input" value={accountNo} onChange={e => setAccountNo(e.target.value)} required />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>New Password</label>
          <input type="password" className="glass-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
        </div>

        <button type="submit" className="glass-button" disabled={loading} style={{ marginTop: '0.5rem' }}>
          {loading ? 'Processing...' : 'Reset Password'}
        </button>
      </form>

      <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
        <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Back to Login</Link>
      </div>
    </div>
  );
}
