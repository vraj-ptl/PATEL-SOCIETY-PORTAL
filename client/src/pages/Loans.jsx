import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { playHoverSound, playClickSound, playSuccessSound } from '../utils/sounds';

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Loan State
  const [newAccNo, setNewAccNo] = useState('');
  const [newPrincipal, setNewPrincipal] = useState(50000);
  const [newYears, setNewYears] = useState(1);
  const [newStartMonth, setNewStartMonth] = useState(1);
  const [newStartYear, setNewStartYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchLoans();
    checkRole();
  }, []);

  const checkRole = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setIsAdmin(res.data.user?.role === 'admin');
    } catch {}
  };

  const fetchLoans = async () => {
    try {
      const res = await axios.get('/api/loans');
      setLoans(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewInstallments = async (id) => {
    if (selectedLoanId === id) {
      setSelectedLoanId(null);
      return;
    }
    try {
      const res = await axios.get(`/api/loans/${id}`);
      setInstallments(res.data.installments);
      setSelectedLoanId(id);
    } catch (err) { alert(err.message); }
  };

  const payInstallment = async (loanId, instNo, event) => {
    event.preventDefault();
    const amount = event.target.amount.value;
    if (!amount || amount <= 0) return;

    try {
      await axios.put(`/api/loans/${loanId}/installments/${instNo}`, { paid_amount: Number(amount) });
      playSuccessSound();
      viewInstallments(loanId);
      fetchLoans();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to pay installment');
    }
  };

  const deleteLoan = async (id) => {
    if(!window.confirm('Delete this loan?')) return;
    try {
      await axios.delete(`/api/loans/${id}`);
      playSuccessSound();
      fetchLoans();
      if(selectedLoanId === id) setSelectedLoanId(null);
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete'); }
  };

  const handleAddLoan = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/loans', {
        account_no: newAccNo,
        principal: Number(newPrincipal),
        time_period_years: Number(newYears),
        start_month: Number(newStartMonth),
        start_year: Number(newStartYear)
      });
      setShowAddModal(false);
      setNewAccNo(''); setNewPrincipal(50000); setNewYears(1); setNewStartMonth(1); 
      playSuccessSound();
      fetchLoans();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create loan');
    }
  };

  if (loading) return <div>Loading loans...</div>;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ margin: 0 }}>Loans Management</h1>
        {isAdmin && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onMouseEnter={playHoverSound} className="glass-button" onClick={() => { playClickSound(); setShowAddModal(true); }}>
            <Plus size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> New Loan
          </motion.button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedLoanId ? '1fr 1fr' : '1fr', gap: '2rem', transition: 'all 0.3s' }}>
        <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loans.map(loan => (
            <motion.div variants={itemVariants} key={loan.id} className={`glass-panel ${selectedLoanId === loan.id ? 'active' : ''}`} style={{ padding: '1.5rem', cursor: 'pointer', borderColor: selectedLoanId === loan.id ? 'var(--accent)' : 'var(--border-color)' }} onMouseEnter={playHoverSound} onClick={() => { playClickSound(); viewInstallments(loan.id); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Acc: {loan.account_no} - {loan.member_name}</h3>
                <span className={`badge ${loan.status}`}>{loan.status.toUpperCase()}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                <span>Principal: ₹{loan.principal}</span>
                <span>Type: {loan.time_period_years} Yrs</span>
                <span>Balance: ₹{loan.remaining_balance}</span>
                <span>Paid: ₹{loan.total_paid}</span>
              </div>
              {isAdmin && (
                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onMouseEnter={playHoverSound} className="glass-button danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }} onClick={(e) => { playClickSound(); e.stopPropagation(); deleteLoan(loan.id); }}><Trash2 size={16} /></motion.button>
                </div>
              )}
            </motion.div>
          ))}
          {loans.length === 0 && <p className="text-muted">No active loans found.</p>}
        </motion.div>

        {selectedLoanId && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-panel" style={{ padding: '1.5rem', alignSelf: 'start', position: 'sticky', top: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Installments</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {installments.map(inst => (
                <div key={inst.id} style={{ padding: '1rem', borderRadius: '8px', background: inst.is_paid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${inst.is_paid ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>{inst.month_label}</strong>
                    <span style={{ color: inst.is_paid ? 'var(--success)' : 'var(--warning)' }}>
                      {inst.is_paid ? 'PAID' : `Target: ₹${inst.default_amount}`}
                    </span>
                  </div>
                  {inst.is_paid ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Paid: ₹{inst.paid_amount} on {inst.paid_date}
                    </div>
                  ) : isAdmin && inst.default_amount > 0 ? (
                    <form onSubmit={(e) => { playClickSound(); payInstallment(selectedLoanId, inst.installment_no, e); }} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input type="number" name="amount" onFocus={playHoverSound} defaultValue={inst.default_amount} className="glass-input" style={{ padding: '0.4rem', fontSize: '0.875rem' }} />
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="glass-button" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>Pay</motion.button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>Issue Loan</h2>
              <button className="glass-button" style={{ padding: '0.5rem', background: 'transparent' }} onClick={() => { playClickSound(); setShowAddModal(false); }}><X size={24} color="#fff" /></button>
            </div>
            <form onSubmit={(e) => { playClickSound(); handleAddLoan(e); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Account Number *</label>
                <input type="text" onFocus={playHoverSound} className="glass-input" value={newAccNo} onChange={e => setNewAccNo(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Principal Amount</label>
                <select className="glass-input" value={newPrincipal} onChange={e => setNewPrincipal(e.target.value)}>
                  <option value="50000" style={{background: '#1e293b'}}>₹50,000</option>
                  <option value="100000" style={{background: '#1e293b'}}>₹100,000</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Time Period</label>
                <select className="glass-input" value={newYears} onChange={e => setNewYears(e.target.value)}>
                  <option value="1" style={{background: '#1e293b'}}>1 Year</option>
                  <option value="2" style={{background: '#1e293b'}}>2 Years</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Start Month</label>
                  <input type="number" min="1" max="12" className="glass-input" value={newStartMonth} onChange={e => setNewStartMonth(e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Start Year</label>
                  <input type="number" className="glass-input" value={newStartYear} onChange={e => setNewStartYear(e.target.value)} required />
                </div>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onMouseEnter={playHoverSound} type="submit" className="glass-button" style={{ marginTop: '0.5rem' }}>Open Loan</motion.button>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
