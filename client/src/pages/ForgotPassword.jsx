import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../utils/axios';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { playHoverSound, playClickSound } from '../utils/sounds';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [timeLeft, setTimeLeft] = useState(90);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await axios.post('/api/auth/forgot-password/request-otp', { username, accountNo });
      setMaskedPhone(res.data.maskedPhone);
      setStep(2);
      setTimeLeft(90);
      setMessage('OTP sent successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.post('/api/auth/reset-password', { username, accountNo, otp, newPassword });
      setMessage('Password reset successfully. Redirecting to login...');
      setTimeout(() => { playClickSound(); navigate('/login'); }, 2000);
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

      {step === 1 ? (
        <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Username</label>
            <input type="text" onFocus={playHoverSound} className="glass-input" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Account Number</label>
            <input type="text" onFocus={playHoverSound} className="glass-input" value={accountNo} onChange={e => setAccountNo(e.target.value)} required />
          </div>

          <button type="submit" onClick={playClickSound} onMouseEnter={playHoverSound} className="glass-button" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Requesting...' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyAndReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '8px', border: '1px solid var(--accent)' }}>
            <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>OTP sent to registered mobile no. </span>
            <strong style={{ color: '#fff', fontSize: '1.05rem', display: 'block', marginTop: '0.2rem' }}>{maskedPhone}</strong>
          </div>

          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <span>Enter OTP</span>
              <span style={{ color: timeLeft > 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 'bold' }}>{formatTime(timeLeft)}</span>
            </label>
            <input type="text" onFocus={playHoverSound} className="glass-input" value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit code" required />
          </div>

          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>New Password</label>
            <input type={showPassword ? "text" : "password"} onFocus={playHoverSound} className="glass-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ paddingRight: '2.5rem' }} required />
            <button 
              type="button"
              onClick={() => { playClickSound(); setShowPassword(!showPassword); }}
              style={{ position: 'absolute', right: '10px', top: '34px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" onClick={playClickSound} onMouseEnter={playHoverSound} className="glass-button" disabled={loading || timeLeft === 0} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Processing...' : 'Verify & Reset Password'}
          </button>
          
          {timeLeft === 0 && (
            <button type="button" onClick={() => { playClickSound(); handleRequestOtp(); }} onMouseEnter={playHoverSound} className="glass-button" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', marginTop: '0.5rem' }}>
              Resend OTP
            </button>
          )}
        </form>
      )}

      <div style={{ textAlign: 'center', fontSize: '0.875rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        {step === 2 && (
          <button type="button" onClick={() => { playClickSound(); setStep(1); setOtp(''); setNewPassword(''); setTimeLeft(90); setError(''); setMessage(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
            <ArrowLeft size={14} /> Back
          </button>
        )}
        <Link to="/login" onClick={playClickSound} onMouseEnter={playHoverSound} style={{ color: 'var(--accent)', textDecoration: 'none' }}>Back to Login</Link>
      </div>
    </div>
  );
}
