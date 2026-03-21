import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Home, Users, CreditCard, LogOut, Wallet, Calendar, Info } from 'lucide-react';
import { playHoverSound, playClickSound } from '../utils/sounds';
import { motion } from 'framer-motion';

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
      navigate('/login');
    }
  };

  return (
    <div className="sidebar">
      <div style={{ padding: '0 1rem', marginBottom: '2rem' }}>
        <h2 className="text-gradient" style={{ margin: 0 }}>Patel Society</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Management Portal</p>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <NavLink to="/dashboard" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          <Home size={20} /> Dashboard
        </NavLink>
        <NavLink to="/members" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          <Users size={20} /> Members
        </NavLink>
        <NavLink to="/loans" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          <CreditCard size={20} /> Loans
        </NavLink>
        <NavLink to="/fees" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          <Calendar size={20} /> Fee Tracker
        </NavLink>
        <NavLink to="/accounting" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          <Wallet size={20} /> Accounting
        </NavLink>
        <NavLink to="/about" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          <Info size={20} /> About Me
        </NavLink>
      </nav>

      <motion.button 
        whileHover={{ scale: 1.02, x: 5 }}
        whileTap={{ scale: 0.98 }}
        onMouseEnter={playHoverSound}
        className="nav-link" 
        onClick={() => { playClickSound(); handleLogout(); }} 
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', color: 'var(--danger)' }}
      >
        <LogOut size={20} /> Logout
      </motion.button>
    </div>
  );
}
