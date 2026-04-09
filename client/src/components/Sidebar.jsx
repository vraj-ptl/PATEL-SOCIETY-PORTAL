import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import { Home, Users, CreditCard, Wallet, Calendar, Info, BarChart2, DollarSign, List } from 'lucide-react';
import { playHoverSound, playClickSound } from '../utils/sounds';
import { motion } from 'framer-motion';

const PortalWrapper = ({ isPortal, children }) => {
  return isPortal ? createPortal(children, document.body) : <>{children}</>;
};

export default function Sidebar() {
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const res = await axios.get('/api/auth/me');
                setIsAdmin(res.data.user?.role === 'admin');
            } catch (err) {
                console.error('Failed to fetch user role', err);
            }
        };
        fetchRole();
    }, []);

    return (
        <>
            {/* Mobile Top App Bar */}
            <PortalWrapper isPortal={isMobile}>
                <div className="mobile-header">
                    <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.25rem' }}>Patel Society</h2>
                </div>
            </PortalWrapper>

            <PortalWrapper isPortal={isMobile}>
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
          <NavLink to="/expenditures" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
            <DollarSign size={20} /> <span className="nav-text">Expenditures</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/transactions" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
              <List size={20} /> <span className="nav-text">Transactions</span>
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/reports" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
              <BarChart2 size={20} /> <span className="nav-text">Reports</span>
            </NavLink>
          )}
          <NavLink to="/about" onClick={playClickSound} onMouseEnter={playHoverSound} className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
            <Info size={20} /> <span className="nav-text">About</span>
          </NavLink>
        </nav>


      </div>
      </PortalWrapper>
    </>
  );
}
