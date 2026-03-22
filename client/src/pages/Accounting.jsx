import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { PlusCircle, MinusCircle, Gift, Calculator, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { playHoverSound, playClickSound, playSuccessSound } from '../utils/sounds';

export default function Accounting() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calculator, setCalculator] = useState(null);

  const [addFundsAmt, setAddFundsAmt] = useState('');
  const [removeFundsAmt, setRemoveFundsAmt] = useState('');
  const [setFundsAmt, setSetFundsAmt] = useState('');
  const [bonusAmt, setBonusAmt] = useState('');

  useEffect(() => {
    checkRole();
    fetchCalculator();
  }, []);

  const checkRole = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setIsAdmin(res.data.user?.role === 'admin');
    } catch {
      setLoading(false);
    }
  };

  const fetchCalculator = async () => {
    try {
      const res = await axios.get('/api/fees/calculator');
      setCalculator(res.data);
    } catch {
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
      fetchCalculator();
      playSuccessSound();
      alert('Funds added successfully!');
    } catch (err) { alert(err.response?.data?.error || 'Error adding funds'); }
  };

  const handleRemoveFunds = async (e) => {
    e.preventDefault();
    if (!removeFundsAmt || removeFundsAmt <= 0) return;
    try {
      if (!window.confirm(`Are you sure you want to completely remove ₹${removeFundsAmt} from the global balance?`)) return;
      await axios.post('/api/dashboard/remove-balance', { amount: removeFundsAmt });
      setRemoveFundsAmt('');
      fetchCalculator();
      playSuccessSound();
      alert('Funds removed successfully!');
    } catch (err) { alert(err.response?.data?.error || 'Error removing funds'); }
  };

  const handleSetFunds = async (e) => {
    e.preventDefault();
    if (setFundsAmt === '' || setFundsAmt === null) return;
    try {
      if (!window.confirm(`Are you absolutely sure you want to OVERWRITE the total global balance to exactly ₹${setFundsAmt}? This will ignore all previous additions. `)) return;
      await axios.post('/api/dashboard/set-balance', { amount: setFundsAmt });
      setSetFundsAmt('');
      fetchCalculator();
      playSuccessSound();
      alert('Total Society Balance has been successfully overridden!');
    } catch (err) { alert(err.response?.data?.error || 'Error overriding funds'); }
  };

  const handleDistributeBonus = async (e) => {
    e.preventDefault();
    if (!bonusAmt || bonusAmt <= 0) return;
    try {
      const res = await axios.post('/api/dashboard/distribute-bonus', { bonusPerMember: bonusAmt });
      setBonusAmt('');
      playSuccessSound();
      alert(res.data.message);
    } catch (err) { alert(err.response?.data?.error || 'Error distributing bonus'); }
  };

  if (loading) return <div>Loading...</div>;

  if (loading) return <div>Loading...</div>;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <h1 className="text-gradient" style={{ marginBottom: '2rem' }}>Society Accounting</h1>

      <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Cost Formula Calculator */}
        {calculator && (
          <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem', gridColumn: '1 / -1', background: 'rgba(139, 92, 246, 0.05)', borderColor: 'rgba(139, 92, 246, 0.2)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#8b5cf6' }}>
              <Calculator size={20} /> Member Onboarding / Leaving Value Calculator
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <p className="text-muted" style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem' }}>Society Start Date</p>
                <strong>August 2018 ({calculator.months_since_aug_2018} months ago)</strong>
              </div>
              <div>
                <p className="text-muted" style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem' }}>Current Base Dues Requirement</p>
                <strong>₹{calculator.base_dues.toLocaleString()} (₹500 / month)</strong>
              </div>
              <div>
                <p className="text-muted" style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem' }}>Total Lifetime Loan Interest Earned</p>
                <strong>₹{calculator.total_society_interest_earned.toLocaleString()}</strong>
              </div>
              <div>
                <p className="text-muted" style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem' }}>Interest Value per Member ({calculator.current_member_count})</p>
                <strong>₹{calculator.interest_share_per_member.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-muted">Total Cost to Join or Value Owed upon Leaving:</span>
              <h2 style={{ margin: 0, color: '#8b5cf6', fontSize: '2rem' }}>₹{calculator.total_onboarding_or_exit_cost.toLocaleString()}</h2>
            </div>
          </motion.div>
        )}

        {isAdmin && (
          <>
            <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <PlusCircle size={20} color="var(--success)" /> Inject Funds
          </h3>
          <form onSubmit={(e) => { playClickSound(); handleAddFunds(e); }} style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="number" onFocus={playHoverSound} className="glass-input" placeholder="Amount (₹)" value={addFundsAmt} onChange={e => setAddFundsAmt(e.target.value)} required />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="glass-button">Add</motion.button>
          </form>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Directly increases Global Society Balance.</p>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.03)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--danger)' }}>
            <MinusCircle size={20} />Remove Funds
          </h3>
          <form onSubmit={(e) => { playClickSound(); handleRemoveFunds(e); }} style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="number" onFocus={playHoverSound} className="glass-input" placeholder="Amount (₹)" value={removeFundsAmt} onChange={e => setRemoveFundsAmt(e.target.value)} required />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="glass-button danger">Remove</motion.button>
          </form>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Directly decreases Global Society Balance. Very destructive action.</p>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(56, 189, 248, 0.03)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#38bdf8' }}>
            <RefreshCw size={20} /> Overwrite Exact Balance
          </h3>
          <form onSubmit={(e) => { playClickSound(); handleSetFunds(e); }} style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="number" onFocus={playHoverSound} className="glass-input" placeholder="New Exact Balance (₹)" value={setFundsAmt} onChange={e => setSetFundsAmt(e.target.value)} required />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="glass-button" style={{ background: 'linear-gradient(135deg, #0284c7, #38bdf8)' }}>Set</motion.button>
          </form>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Completely overwrites the society balance. Ignores past totals.</p>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Gift size={20} color="#ec4899" /> Distribute Bonus
          </h3>
          <form onSubmit={(e) => { playClickSound(); handleDistributeBonus(e); }} style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="number" onFocus={playHoverSound} className="glass-input" placeholder="Bonus per Member (₹)" value={bonusAmt} onChange={e => setBonusAmt(e.target.value)} required />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="glass-button" style={{ background: '#ec4899' }}>Send</motion.button>
          </form>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Cost: ₹{bonusAmt ? (bonusAmt * (calculator?.current_member_count || 0)) : 0} from Society Balance. Goes to individual member wallets.</p>
          </motion.div>
          </>
        )}

      </motion.div>
    </motion.div>
  );
}
