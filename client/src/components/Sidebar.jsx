import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
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
    <>
      {/* Mobile Top App Bar (Hidden on Desktop via CSS) */}
      <div className="mobile-header">
        <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.25rem' }}>Patel Society</h2>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => { playClickSound(); handleLogout(); }} 
          style={{ background: 'transparent', border: 'none', color: 'var(--danger)', padding: '0.5rem' }}
        >
          <LogOut size={22} />
        </motion.button>
      </div>

      <div className="sidebar">
        <div className="sidebar-brand-wrapper" style={{ padding: '0 1rem', marginBottom: '2rem' }}>
          <h2 className="text-gradient" style={{ margin: 0 }}>Patel Society</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Management Portal</p>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <NavLink to="/dashboard" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
            <Home size={20} /> <span className="nav-text">Dashboard</span>
          </NavLink>
          <NavLink to="/members" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
            <Users size={20} /> <span className="nav-text">Members</span>
          </NavLink>
          <NavLink to="/loans" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
            <CreditCard size={20} /> <span className="nav-text">Loans</span>
          </NavLink>
          <NavLink to="/fees" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
            <Calendar size={20} /> <span className="nav-text">Fee Tracker</span>
          </NavLink>
          <NavLink to="/accounting" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
            <Wallet size={20} /> <span className="nav-text">Accounting</span>
          </NavLink>
          <NavLink to="/about" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
            <Info size={20} /> <span className="nav-text">About</span>
          </NavLink>
        </nav>

        <motion.button 
          whileHover={{ scale: 1.02, x: 5 }}
          whileTap={{ scale: 0.98 }}
          onMouseEnter={playHoverSound}
          className="nav-link logout-desktop-btn" 
          onClick={() => { playClickSound(); handleLogout(); }} 
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', color: 'var(--danger)' }}
        >
          <LogOut size={20} /> <span className="nav-text">Logout</span>
        </motion.button>
      </div>
    </>
  );
}
