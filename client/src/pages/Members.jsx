import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from '../utils/axios';
import { Search, Plus, Trash2, ChevronDown, ChevronRight, X, User, Eye, EyeOff, Edit2, Check, UserPlus, Minus } from 'lucide-react';
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
  const [viewMember, setViewMember] = useState(null);

  // Edit Member State
  const [editingMember, setEditingMember] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', village: '', phone: '' });

  // Add Account Form State
  const [newAccNo, setNewAccNo] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [membersList, setMembersList] = useState([{ name: '', village: '', phone: '' }]);

  // Add Member to Existing Account State
  const [addMemberAccId, setAddMemberAccId] = useState(null);
  const [addMemberData, setAddMemberData] = useState({ name: '', village: '', phone: '' });

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
      // Sort numerically so accounts display as 1,2,3...10,11 instead of 1,11,12,2...
      const sorted = [...res.data].sort((a, b) => {
        const numA = parseInt(a.account_no, 10);
        const numB = parseInt(b.account_no, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.account_no.localeCompare(b.account_no);
      });
      setAccounts(sorted);

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

  const handleEditClick = (member) => {
    setEditingMember(member.id);
    setEditFormData({ name: member.name, village: member.village, phone: member.phone });
  };

  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async (memberId) => {
    try {
      await axios.put(`/api/accounts/${memberId}`, editFormData);
      playSuccessSound();
      setEditingMember(null);
      fetchAccounts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update member');
    }
  };

  const handleEditCancel = () => {
    setEditingMember(null);
  };

  const handleAddMemberRow = () => {
    if (membersList.length >= 6) return alert("Max 6 members allowed");
    setMembersList([...membersList, { name: '', village: '', phone: '' }]);
  };

  const handleRemoveMemberRow = (index) => {
    if (membersList.length <= 1) return;
    setMembersList(membersList.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index, field, value) => {
    const list = [...membersList];
    list[index][field] = value;
    setMembersList(list);
  };

  // Compute next sequential account number
  const getNextAccountNo = () => {
    if (accounts.length === 0) return '1';
    const nums = accounts.map(a => parseInt(a.account_no, 10)).filter(n => !isNaN(n));
    if (nums.length === 0) return '1';
    return String(Math.max(...nums) + 1);
  };

  // Open add account modal with auto-filled account number
  const openAddModal = () => {
    setNewAccNo(getNextAccountNo());
    setShowAddModal(true);
  };

  // Add member to existing account
  const handleAddMemberToAccount = async (accountNo) => {
    if (!addMemberData.name || !addMemberData.village) {
      return alert('Name and Village are required');
    }
    try {
      await axios.post(`/api/accounts/${accountNo}/members`, addMemberData);
      playSuccessSound();
      setAddMemberAccId(null);
      setAddMemberData({ name: '', village: '', phone: '' });
      fetchAccounts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add member');
    }
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
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onMouseEnter={playHoverSound} className="glass-button" onClick={() => { playClickSound(); openAddModal(); }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  {account.members.map(member => (
                    <div key={member.id} className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', cursor: 'pointer' }} onClick={() => { playClickSound(); setViewMember({ member, account }); }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: 0 }}>
                          <User size={32} color="#8b5cf6" style={{ flexShrink: 0 }} />
                          {editingMember === member.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }} onClick={e => e.stopPropagation()}>
                              <input type="text" className="glass-input" value={editFormData.name} onChange={e => handleEditChange('name', e.target.value)} placeholder="Name" style={{ padding: '0.3rem 0.5rem', fontSize: '0.875rem' }} />
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input type="text" className="glass-input" value={editFormData.village} onChange={e => handleEditChange('village', e.target.value)} placeholder="Village" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', width: '50%' }} />
                                <input type="text" className="glass-input" value={editFormData.phone} onChange={e => handleEditChange('phone', e.target.value)} placeholder="Phone" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', width: '50%' }} />
                              </div>
                            </div>
                          ) : (
                            <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <h4 style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name} {member.position === 1 && '(Primary)'}</h4>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.village} • {member.phone}</span>
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                           <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'flex-start' }}>
                             {editingMember === member.id ? (
                               <>
                                 <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onMouseEnter={playHoverSound} className="glass-button" title="Save" style={{ background: 'transparent', padding: '0.4rem', color: 'var(--success)' }} onClick={(e) => { e.stopPropagation(); playClickSound(); handleEditSubmit(member.id); }}><Check size={16} /></motion.button>
                                 <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onMouseEnter={playHoverSound} className="glass-button" title="Cancel" style={{ background: 'transparent', padding: '0.4rem', color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); playClickSound(); handleEditCancel(); }}><X size={16} /></motion.button>
                               </>
                             ) : (
                               <>
                                 <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onMouseEnter={playHoverSound} className="glass-button" title="Edit" style={{ background: 'transparent', padding: '0.4rem', color: '#3b82f6' }} onClick={(e) => { e.stopPropagation(); playClickSound(); handleEditClick(member); }}><Edit2 size={16} /></motion.button>
                                 <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onMouseEnter={playHoverSound} className="glass-button" title="Delete" style={{ background: 'transparent', padding: '0.4rem', color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); playClickSound(); handleDeleteMember(member.id); }}><Trash2 size={16} /></motion.button>
                               </>
                             )}
                           </div>
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

                {/* Add Member to Existing Account */}
                {isAdmin && account.members.length < 6 && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    {addMemberAccId === account.id ? (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <h4 style={{ margin: 0, color: '#8b5cf6' }}>Add New Member</h4>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <input type="text" className="glass-input" placeholder="Name *" value={addMemberData.name} onChange={e => setAddMemberData(p => ({ ...p, name: e.target.value }))} style={{ flex: 1, minWidth: '120px' }} />
                          <input type="text" className="glass-input" placeholder="Village *" value={addMemberData.village} onChange={e => setAddMemberData(p => ({ ...p, village: e.target.value }))} style={{ flex: 1, minWidth: '120px' }} />
                          <input type="text" className="glass-input" placeholder="Phone (Optional)" value={addMemberData.phone} onChange={e => setAddMemberData(p => ({ ...p, phone: e.target.value }))} style={{ flex: 1, minWidth: '120px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="glass-button" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'rgba(139,92,246,0.2)', border: '1px solid #8b5cf6' }} onClick={() => { playClickSound(); handleAddMemberToAccount(account.account_no); }}>
                            <Check size={16} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> Save Member
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="glass-button" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => { playClickSound(); setAddMemberAccId(null); setAddMemberData({ name: '', village: '', phone: '' }); }}>
                            <X size={16} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> Cancel
                          </motion.button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onMouseEnter={playHoverSound} className="glass-button" style={{ width: '100%', padding: '0.6rem', fontSize: '0.875rem', background: 'rgba(139,92,246,0.08)', border: '1px dashed rgba(139,92,246,0.4)' }} onClick={() => { playClickSound(); setAddMemberAccId(account.id); }}>
                        <UserPlus size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> Add New Member to This Account
                      </motion.button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        ))}
        {accounts.length === 0 && <p className="text-muted">No accounts found.</p>}
      </motion.div>

      {/* View Member Details Modal */}
      {viewMember && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }} onClick={() => setViewMember(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-dark)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '1rem', borderRadius: '50%', flexShrink: 0 }}>
                  <User size={40} color="#8b5cf6" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', lineHeight: '1.2' }}>{viewMember.member.name}</h3>
                  <p style={{ color: 'var(--accent)', margin: '0.25rem 0 0 0', fontWeight: 'bold' }}>{viewMember.member.position === 1 ? 'Primary Member' : 'Member'}</p>
                </div>
              </div>
              <button className="glass-button" style={{ padding: '0.5rem', background: 'transparent' }} onClick={() => { playClickSound(); setViewMember(null); }}><X size={24} color="var(--text-muted)" /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Account Number</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>#{viewMember.account.account_no}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Village</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{viewMember.member.village}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Phone Number</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{viewMember.member.phone}</div>
              </div>
              
              <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {(isAdmin || viewMember.account.id === currentUserAccountId) ? (
                  <>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Wallet Bonus</div>
                        <div style={{ color: '#ec4899', fontWeight: 'bold', fontSize: '1.25rem' }}>₹{viewMember.member.wallet_balance || 0}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Dues Paid</div>
                        <div style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '1.25rem' }}>₹{viewMember.member.total_principal_paid || 0}</div>
                    </div>
                    {calcData && (
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Liquid Exit Value</div>
                            <div style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '1.5rem' }}>₹{calcData.total_onboarding_or_exit_cost.toLocaleString()}</div>
                        </div>
                    )}
                  </>
                ) : (
                  <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                    Financial details are private.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {showAddModal && createPortal(
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
                <div style={{ flex: 1, position: 'relative' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Login Password (min 6)</label>
                  <input type={showNewPass ? "text" : "password"} onFocus={playHoverSound} className="glass-input" value={newPass} onChange={e => setNewPass(e.target.value)} style={{ paddingRight: '2.5rem' }} />
                  <button 
                    type="button"
                    onClick={() => { playClickSound(); setShowNewPass(!showNewPass); }}
                    style={{ position: 'absolute', right: '10px', top: '34px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                  >
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
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
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <input type="text" onFocus={playHoverSound} className="glass-input" placeholder="Name *" value={m.name} onChange={e => handleMemberChange(i, 'name', e.target.value)} required />
                    <input type="text" onFocus={playHoverSound} className="glass-input" placeholder="Village *" value={m.village} onChange={e => handleMemberChange(i, 'village', e.target.value)} required />
                    <input type="text" onFocus={playHoverSound} className="glass-input" placeholder="Phone (Optional)" value={m.phone} onChange={e => handleMemberChange(i, 'phone', e.target.value)} />
                    {membersList.length > 1 && (
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button" title="Remove this member row" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '0.45rem', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => { playClickSound(); handleRemoveMemberRow(i); }}>
                        <Minus size={16} />
                      </motion.button>
                    )}
                  </div>
                ))}
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" onMouseEnter={playHoverSound} onClick={playClickSound} className="glass-button" style={{ marginTop: '1rem' }}>Create Full Account</motion.button>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
