import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';
import { IndianRupee, Users, CreditCard, CheckCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { playHoverSound, playClickSound, playSuccessSound } from '../utils/sounds';
import Loader from '../components/Loader';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');

  // Action states
  const [addFundsAmt, setAddFundsAmt] = useState('');
  const [bonusAmt, setBonusAmt] = useState('');
  const [lifetimeInterestAmt, setLifetimeInterestAmt] = useState('');

  useEffect(() => {
    checkRole();
    fetchStats();
  }, []);

  const checkRole = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setIsAdmin(res.data.user?.role === 'admin');
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/dashboard');
      if (res.data) {
        setStats(res.data);
      } else {
        setError('No data received from server');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        window.location.href = '/login';
        return;
      }
      setError(err.response?.data?.error || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFunds = async (e) => {
    e.preventDefault();
    if (!addFundsAmt || addFundsAmt <= 0) return;
    try {
      await axios.post('/api/dashboard/add-balance', { amount: addFundsAmt });
      setAddFundsAmt('');
      fetchStats();
      playSuccessSound();
      alert('Funds added successfully!');
    } catch (err) { alert(err.response?.data?.error || 'Error adding funds'); }
  };

  const handleDistributeBonus = async (e) => {
    e.preventDefault();
    if (!bonusAmt || bonusAmt <= 0) return;
    try {
      const res = await axios.post('/api/dashboard/distribute-bonus', { bonusPerAccount: bonusAmt });
      setBonusAmt('');
      fetchStats();
      playSuccessSound();
      alert(res.data.message);
    } catch (err) { alert(err.response?.data?.error || 'Error distributing bonus'); }
  };

  const handleChargeFees = async () => {
    if(!window.confirm('Charge ₹500 monthly fee to EVERY active member?')) return;
    try {
      const res = await axios.post('/api/dashboard/charge-monthly-fees');
      playSuccessSound();
      alert(res.data.message);
    } catch (err) { alert(err.response?.data?.error || 'Error charging fees'); }
  };

  const handleSetLifetimeInterest = async (e) => {
    e.preventDefault();
    if (lifetimeInterestAmt === '' || lifetimeInterestAmt < 0) return;
    try {
      await axios.post('/api/dashboard/set-lifetime-interest', { amount: lifetimeInterestAmt });
      setLifetimeInterestAmt('');
      fetchStats();
      playSuccessSound();
      alert('Total Lifetime Interest updated successfully!');
    } catch (err) { alert(err.response?.data?.error || 'Error updating interest'); }
  };

  if (loading) return <Loader text="Loading dashboard..." />;

  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ color: 'var(--danger)' }}>Error</h2>
      <p style={{ color: 'var(--text-muted)' }}>{error}</p>
      <motion.button whileHover={{ scale: 1.05 }} className="glass-button" onClick={fetchStats} style={{ marginTop: '1.5rem' }}>Retry</motion.button>
    </div>
  );

  if (!stats) return null;

  const cards = [
    { title: 'Total Society Balance', value: `₹${((stats.total_balance || 0) + (stats.total_pending_loans || 0)).toLocaleString()}`, icon: <IndianRupee size={24} />, color: '#8b5cf6' },
    { title: 'Available Balance', value: `₹${(stats.total_balance || 0).toLocaleString()}`, icon: <IndianRupee size={24} />, color: 'var(--success)' },
    { title: 'Total Expenditures', value: `₹${(stats.total_expenditure || 0).toLocaleString()}`, icon: <TrendingUp size={24} />, color: '#ef4444' },
    { title: 'Pending Loans Issued', value: `₹${(stats.total_pending_loans || 0).toLocaleString()}`, icon: <CreditCard size={24} />, color: 'var(--warning)' },
    { title: 'Active Loans', value: stats.active_loans || 0, icon: <CreditCard size={24} />, color: 'var(--accent)' },
    { title: 'Completed Loans', value: stats.completed_loans || 0, icon: <CheckCircle size={24} />, color: 'var(--success)' },
    { title: 'Total Lifetime Interest', value: `₹${(stats.total_lifetime_interest_earned || 0).toLocaleString()}`, icon: <TrendingUp size={24} />, color: '#f59e0b' },
    { title: 'Total Accounts', value: stats.total_accounts || 0, icon: <Users size={24} />, color: '#8b5cf6' },
    { title: 'Total Members', value: stats.total_members || 0, icon: <Users size={24} />, color: '#ec4899' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <h1 className="text-gradient" style={{ marginBottom: '2rem' }}>Society Dashboard</h1>
      
      <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {cards.map((card, i) => (
          <motion.div variants={itemVariants} key={i} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'default' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)'; playHoverSound(); }}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
          >
            <div style={{ backgroundColor: `${card.color}20`, color: card.color, padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {card.icon}
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{card.title}</p>
              <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600 }}>{card.value}</h2>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {isAdmin && (
        <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="#f59e0b" /> Set Total Lifetime Interest
            </h3>
            <form onSubmit={(e) => { playClickSound(); handleSetLifetimeInterest(e); }} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input type="number" min="0" onFocus={playHoverSound} className="glass-input" placeholder="Enter total lifetime interest (₹)" value={lifetimeInterestAmt} onChange={e => setLifetimeInterestAmt(e.target.value)} style={{ flex: 1 }} required />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="glass-button" style={{ whiteSpace: 'nowrap' }}>Update</motion.button>
            </form>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>This will replace the current lifetime interest value.</p>
          </motion.div>
        </motion.div>
      )}


    </motion.div>
  );
}
