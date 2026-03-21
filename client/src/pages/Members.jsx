import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Trash2, ChevronDown, ChevronRight, X, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { playHoverSound, playClickSound, playSuccessSound } from '../utils/sounds';

export default function Members() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserAccountId, setCurrentUserAccountId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedActive, setExpandedActive] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [calcData, setCalcData] = useState(null);

  // Add Account Form State
  const [newAccNo, setNewAccNo] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [membersList, setMembersList] = useState([{ name: '', village: '', phone: '' }]);

  useEffect(() => {
    fetchAccounts();
    checkRole();
  }, []);

  const checkRole = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setIsAdmin(res.data.user?.role === 'admin');
      setCurrentUserAccountId(res.data.user?.account_id);
    } catch {}
  };

  const fetchAccounts = async () => {
    try {
      const res = await axios.get('/api/accounts');
      setAccounts(res.data);

      const calcRes = await axios.get('/api/fees/calculator');
      setCalcData(calcRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => setExpandedActive(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSearch = (e) => setSearchTerm(e.target.value);

  const filteredAccounts = accounts.filter(acc => {
    const term = searchTerm.toLowerCase();
    if (acc.account_no.toLowerCase().includes(term)) return true;
    return acc.members.some(m => 
      m.name.toLowerCase().includes(term) || 
      m.village.toLowerCase().includes(term) || 
      (m.phone && m.phone.includes(term))
    );
  });

  const handleDeleteAccount = async (accountNo) => {
    if (!window.confirm(`Delete account ${accountNo}?`)) return;
    try {
      await axios.delete(`/api/accounts/${accountNo}`);
      playSuccessSound();
      fetchAccounts();
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete'); }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm('Delete this member? Any dues paid by them WILL NOT be refunded automatically by the system! If they are leaving, make sure to pay them their Total Leaving Value first!')) return;
    try {
      await axios.delete(`/api/accounts/member/${id}`);
      playSuccessSound();
      fetchAccounts();
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete'); }
  };

  const handleAddMemberRow = () => {
    if (membersList.length >= 6) return alert("Max 6 members allowed");
    setMembersList([...membersList, { name: '', village: '', phone: '' }]);
  };

  const handleMemberChange = (index, field, value) => {
    const list = [...membersList];
    list[index][field] = value;
    setMembersList(list);
  };

  const handleSubmitAccount = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/accounts', {
        account_no: newAccNo,
        username: newUser || undefined,
        password: newPass || undefined,
        members: membersList
      });
      setShowAddModal(false);
      setNewAccNo(''); setNewUser(''); setNewPass('');
      setMembersList([{ name: '', village: '', phone: '' }]);
      playSuccessSound();
      fetchAccounts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create account');
    }
  };

  if (loading) return <div>Loading members...</div>;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ margin: 0 }}>Society Members</h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, minWidth: '250px', maxWidth: '400px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="glass-input" 
            placeholder="Search accounts, names, or phones..." 
            value={searchTerm}
            onChange={handleSearch}
            style={{ paddingLeft: '2.5rem', width: '100%', margin: 0 }}
          />
        </div>

        {isAdmin && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onMouseEnter={playHoverSound} className="glass-button" onClick={() => { playClickSound(); setShowAddModal(true); }}>
            <Plus size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Add Account
          </motion.button>
        )}
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredAccounts.map(account => (
          <motion.div variants={itemVariants} key={account.id} className="glass-panel" style={{ overflow: 'hidden' }}>
            <div 
              style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
              onMouseEnter={playHoverSound}
              onClick={() => { playClickSound(); toggleExpand(account.id); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {expandedActive[account.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <h3 style={{ margin: 0 }}>Account #{account.account_no}</h3>
                <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>{account.members.length} Members</span>
              </div>

              {isAdmin && (
                <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onMouseEnter={playHoverSound} className="glass-button danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }} onClick={() => { playClickSound(); handleDeleteAccount(account.account_no); }}><Trash2 size={16} /></motion.button>
                </div>
              )}
            </div>
            
            {expandedActive[account.id] && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                  {account.members.map(member => (
                    <div key={member.id} className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <User size={32} color="#8b5cf6" />
                          <div>
                            <h4 style={{ margin: 0 }}>{member.name} {member.position === 1 && '(Primary)'}</h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.village} • {member.phone}</span>
                          </div>
                        </div>
                        {isAdmin && (
                           <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onMouseEnter={playHoverSound} className="glass-button" style={{ background: 'transparent', padding: '0.4rem' }} onClick={() => { playClickSound(); handleDeleteMember(member.id); }}><Trash2 size={16} color="var(--danger)" /></motion.button>
                        )}
                      </div>
                      
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.875rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {(isAdmin || account.id === currentUserAccountId) ? (
                          <>
                            <div style={{ color: 'var(--text-muted)' }}>Wallet Bonus:</div>
                            <div style={{ textAlign: 'right', color: '#ec4899', fontWeight: 'bold' }}>₹{member.wallet_balance || 0}</div>
                            
                            <div style={{ color: 'var(--text-muted)' }}>Total Dues Paid:</div>
                            <div style={{ textAlign: 'right', color: 'var(--success)' }}>₹{member.total_principal_paid || 0}</div>

                            {calcData && (
                              <>
                                <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Liquid Exit Value:</div>
                                <div style={{ textAlign: 'right', color: '#8b5cf6', fontWeight: 'bold', marginTop: '0.5rem' }}>₹{calcData.total_onboarding_or_exit_cost.toLocaleString()}</div>
                              </>
                            )}
                          </>
                        ) : (
                          <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem' }}>
                            Financial details are private.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
        {accounts.length === 0 && <p className="text-muted">No accounts found.</p>}
      </motion.div>

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel" style={{ width: '90%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>Add New Account</h2>
              <button className="glass-button" style={{ padding: '0.5rem', background: 'transparent' }} onClick={() => { playClickSound(); setShowAddModal(false); }}><X size={24} color="#fff" /></button>
            </div>
            
            {calcData && (
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid #8b5cf6', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                <strong style={{ color: '#8b5cf6' }}>Note: </strong> 
                Every member joining today legally owes the Society <strong>₹{calcData.total_onboarding_or_exit_cost.toLocaleString()}</strong> as a mandatory onboarding fee! Ensure this manual cash check has been received.
              </div>
            )}

            <form onSubmit={handleSubmitAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Account Number *</label>
                <input type="text" className="glass-input" value={newAccNo} onChange={e => setNewAccNo(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Login Username</label>
                  <input type="text" onFocus={playHoverSound} className="glass-input" value={newUser} onChange={e => setNewUser(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Login Password (min 6)</label>
                  <input type="password" onFocus={playHoverSound} className="glass-input" value={newPass} onChange={e => setNewPass(e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>Members ({membersList.length}/6)</h3>
                  {membersList.length < 6 && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" className="glass-button" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }} onMouseEnter={playHoverSound} onClick={() => { playClickSound(); handleAddMemberRow(); }}>+ Add Member Data</motion.button>
                  )}
                </div>
                {membersList.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="text" onFocus={playHoverSound} className="glass-input" placeholder="Name *" value={m.name} onChange={e => handleMemberChange(i, 'name', e.target.value)} required />
                    <input type="text" onFocus={playHoverSound} className="glass-input" placeholder="Village *" value={m.village} onChange={e => handleMemberChange(i, 'village', e.target.value)} required />
                    <input type="text" onFocus={playHoverSound} className="glass-input" placeholder="Phone *" value={m.phone} onChange={e => handleMemberChange(i, 'phone', e.target.value)} required />
                  </div>
                ))}
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" onMouseEnter={playHoverSound} onClick={playClickSound} className="glass-button" style={{ marginTop: '1rem' }}>Create Full Account</motion.button>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
