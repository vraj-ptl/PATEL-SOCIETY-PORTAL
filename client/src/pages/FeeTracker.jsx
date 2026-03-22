import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { Search, History, Check, X, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { playHoverSound, playClickSound, playSuccessSound } from '../utils/sounds';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function FeeTracker() {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedMember, setSelectedMember] = useState(null);
  const [feeHistory, setFeeHistory] = useState(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const authRes = await axios.get('/api/auth/me');
      const userIsAdmin = authRes.data.user?.role === 'admin';
      const userAccId = authRes.data.user?.account_id;
      
      setIsAdmin(userIsAdmin);

      const accRes = await axios.get('/api/accounts');
      const allMembers = [];
      accRes.data.forEach(acc => {
        acc.members.forEach(m => {
          allMembers.push({ ...m, account_no: acc.account_no, account_id: acc.id });
        });
      });
      
      const viewableMembers = userIsAdmin 
        ? allMembers 
        : allMembers.filter(m => m.account_id === userAccId);

      setMembers(viewableMembers);
      setFilteredMembers(viewableMembers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    const term = val.toLowerCase();
    const filtered = members.filter(m => 
      m.name.toLowerCase().includes(term) || m.account_no.toLowerCase().includes(term)
    );
    setFilteredMembers(filtered);
  };

  const selectMember = async (member) => {
    setSelectedMember(member);
    setFeeHistory(null);
    try {
      const res = await axios.get(`/api/fees/member/${member.id}`);
      setFeeHistory(res.data.history);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to fetch fee history');
    }
  };

  const markAsPaid = async (month, year) => {
    if (!isAdmin) return;
    if (!window.confirm(`Mark ${MONTH_NAMES[month-1]} ${year} as PAID for ${selectedMember.name}?`)) return;
    
    try {
      await axios.post('/api/fees/pay', {
        member_id: selectedMember.id,
        month,
        year
      });
      // Refresh timeline
      const res = await axios.get(`/api/fees/member/${selectedMember.id}`);
      setFeeHistory(res.data.history);
      playSuccessSound();
      alert('Fee successfully logged and added to Society Balance.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to process payment');
    }
  };

  const markAsUnpaid = async (month, year) => {
    if (!isAdmin) return;
    if (!window.confirm(`WARNING: Are you sure you want to REVERSE ${MONTH_NAMES[month-1]} ${year} as UNPAID for ${selectedMember.name}?\n\nThis will instantly DEDUCT ₹500 from the Society Balance and the member's paid total.`)) return;
    
    try {
      await axios.post('/api/fees/unpay', {
        member_id: selectedMember.id,
        month,
        year
      });
      // Refresh timeline
      const res = await axios.get(`/api/fees/member/${selectedMember.id}`);
      setFeeHistory(res.data.history);
      playSuccessSound();
      alert('Fee reversal successful. ₹500 has been deducted from the Society Balance.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to process reversal');
    }
  };

  // Group history by Year
  const groupedHistory = {};
  if (feeHistory) {
    feeHistory.forEach(record => {
      if (!groupedHistory[record.year]) groupedHistory[record.year] = [];
      groupedHistory[record.year].push(record);
    });
  }

  if (loading) return <div>Loading Fee Tracker...</div>;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const timelineContainerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const timelineItemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 100px)' }}>
      {/* Left Sidebar: Member Search */}
      <div className="glass-panel" style={{ width: '350px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ margin: '0 0 1rem 0' }}>{isAdmin ? 'Search Members' : 'Your Family'}</h2>
          {isAdmin && (
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', top: '10px', left: '10px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Name or Account No..." 
                value={searchTerm}
                onChange={handleSearch}
                onFocus={playHoverSound}
                style={{ paddingLeft: '2.5rem', width: '100%' }}
              />
            </div>
          )}
        </div>
        
        <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ flex: 1, overflowY: 'auto' }}>
          {filteredMembers.map(m => (
            <motion.div variants={itemVariants}
              key={m.id} 
              onMouseEnter={playHoverSound}
              onClick={() => { playClickSound(); selectMember(m); }}
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer',
                background: selectedMember?.id === m.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                borderLeft: selectedMember?.id === m.id ? '3px solid #8b5cf6' : '3px solid transparent'
              }}
            >
              <div style={{ fontWeight: 600 }}>{m.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Account #{m.account_no}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Right Pane: Timeline */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!selectedMember ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <History size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3>Select a member to view or pay monthly fees</h3>
            </div>
          </motion.div>
        ) : (
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#8b5cf6', borderRadius: '50%', padding: '0.5rem' }}>
                <User size={32} color="#fff" />
              </div>
              <div>
                <h2 style={{ margin: 0 }}>{selectedMember.name}</h2>
                <div style={{ color: 'var(--text-muted)' }}>Acc #{selectedMember.account_no} • {selectedMember.phone}</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {!feeHistory ? <div>Loading timeline...</div> : (
                <motion.div variants={timelineContainerVariants} initial="hidden" animate="show">
                  {Object.keys(groupedHistory).sort((a,b) => b - a).map(year => (
                    <div key={year} style={{ marginBottom: '2.5rem' }}>
                      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>{year}</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                        {groupedHistory[year].map(record => (
                          <motion.div variants={timelineItemVariants} key={`${record.year}-${record.month}`} style={{
                          background: record.is_paid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                          border: `1px solid ${record.is_paid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
                          borderRadius: '8px',
                          padding: '1rem',
                          textAlign: 'center',
                          position: 'relative'
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{MONTH_NAMES[record.month-1]}</div>
                          {record.is_paid ? (
                            <>
                              <Check size={20} color="var(--success)" style={{ margin: '0 auto' }} />
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{new Date(record.paid_date).toLocaleDateString()}</div>
                              {isAdmin && (
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onMouseEnter={playHoverSound} className="glass-button" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', width: '100%', marginTop: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={() => { playClickSound(); markAsUnpaid(record.month, record.year); }}>
                                  Reverse
                                </motion.button>
                              )}
                            </>
                          ) : (
                            <>
                              <X size={20} color="var(--danger)" style={{ margin: '0 auto', marginBottom: '0.5rem' }} />
                              {isAdmin && (
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onMouseEnter={playHoverSound} className="glass-button" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', width: '100%' }} onClick={() => { playClickSound(); markAsPaid(record.month, record.year); }}>
                                  Mark Paid
                                </motion.button>
                              )}
                            </>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
