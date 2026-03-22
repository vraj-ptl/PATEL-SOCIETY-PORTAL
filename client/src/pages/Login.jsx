import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../utils/axios';
import { Hexagon, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { playHoverSound, playClickSound, playSuccessSound } from '../utils/sounds';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('rememberedUsername');
    if (saved) {
      setUsername(saved);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/login', { username, password });
      if (res.data.user) {
        if (rememberMe) localStorage.setItem('rememberedUsername', username);
        else localStorage.removeItem('rememberedUsername');
        playSuccessSound();
        navigate('/dashboard');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data || err.message || 'Login failed';
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ 
      padding: '4rem 3.5rem', 
      width: '100%', 
      maxWidth: '520px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '2.5rem', 
      zIndex: 10,
      background: 'rgba(15, 23, 42, 0.25)', /* Extremely clear glass */
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      boxShadow: '0 0 40px rgba(139, 92, 246, 0.15), inset 0 0 20px rgba(255,255,255,0.05)',
      borderColor: 'rgba(255,255,255,0.1)',
      margin: 'auto'
    }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2
          }}
          style={{ 
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(56, 189, 248, 0.2))',
            padding: '1.25rem',
            borderRadius: '24px',
            marginBottom: '1.5rem',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          <Hexagon size={56} color="#a78bfa" strokeWidth={1.5} />
        </motion.div>
        
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.25rem', letterSpacing: '-0.5px' }}>Patel Society</h1>
        <p className="text-muted" style={{ fontSize: '1rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Secure Portal Access</p>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '0.85rem', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', fontSize: '0.875rem', textAlign: 'center' }}>
          {error}
        </motion.div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px' }}>USERNAME</label>
          <input 
            type="text" 
            className="glass-input" 
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onFocus={playHoverSound}
            required
          />
        </div>
        
        <div style={{ position: 'relative' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px' }}>PASSWORD</label>
          <input 
            type={showPassword ? "text" : "password"} 
            className="glass-input" 
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={playHoverSound}
            style={{ paddingRight: '2.5rem' }}
            required
          />
          <button 
            type="button"
            onClick={() => { playClickSound(); setShowPassword(!showPassword); }}
            style={{ position: 'absolute', right: '10px', top: '34px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '-0.5rem' }}>
          <input 
            type="checkbox" 
            id="remember" 
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <label htmlFor="remember" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Remember me</label>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onMouseEnter={playHoverSound}
          onClick={playClickSound}
          type="submit" 
          className="glass-button" 
          disabled={loading} 
          style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem', letterSpacing: '1px', boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.5)' }}
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </motion.button>
      </form>

      <div style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '0.5rem' }}>
        <Link to="/forgot-password" onClick={playClickSound} onMouseEnter={playHoverSound} style={{ color: '#a78bfa', textDecoration: 'none', transition: 'color 0.2s' }}>Forgot Password?</Link>
      </div>
    </div>
  );
}
