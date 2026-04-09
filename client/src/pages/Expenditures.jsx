import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from '../utils/axios';
import { Plus, Trash2, X, Undo2, LogOut, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { playHoverSound, playClickSound, playSuccessSound } from '../utils/sounds';

export default function Expenditures() {
  const [expenditures, setExpenditures] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Category State
  const [newCategoryName, setNewCategoryName] = useState('');

  // New Expenditure State
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCategoryId, setNewExpCategoryId] = useState('');
  const [newExpDescription, setNewExpDescription] = useState('');
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    checkRole();
    fetchData();
  }, []);

  const checkRole = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setIsAdmin(res.data.user?.role === 'admin');
    } catch {}
  };

  const fetchData = async () => {
    try {
      const catRes = await axios.get('/api/expenditures/categories');
      setCategories(catRes.data);
      if (catRes.data.length > 0) setNewExpCategoryId(catRes.data[0]._id);

      const expRes = await axios.get('/api/expenditures');
      setExpenditures(expRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await axios.post('/api/expenditures/categories', { name: newCategoryName });
      setNewCategoryName('');
      playSuccessSound();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await axios.delete(`/api/expenditures/categories/${id}`);
      playSuccessSound();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete category');
    }
  };

  const handleAddExpenditure = async (e) => {
    e.preventDefault();
    if (!newExpCategoryId || !newExpAmount || !newExpDescription || !newExpDate) return;
    try {
      const res = await axios.post('/api/expenditures', {
        category_id: newExpCategoryId,
        amount: newExpAmount,
        description: newExpDescription,
        date: newExpDate
      });
      setShowAddModal(false);
      setNewExpAmount('');
      setNewExpDescription('');
      setNewExpDate(new Date().toISOString().split('T')[0]);
      playSuccessSound();
      alert(res.data.message);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add expenditure');
    }
  };

  const handleUndoExpenditure = async (id) => {
    if (!window.confirm('Undo this expenditure? Funds will be added back to Society Balance.')) return;
    try {
      const res = await axios.delete(`/api/expenditures/${id}/undo`);
      playSuccessSound();
      alert(res.data.message);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to undo expenditure');
    }
  };

  if (loading) return <div>Loading expenditures...</div>;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="text-gradient" style={{ margin: 0 }}>Society Expenditures</h1>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onMouseEnter={playHoverSound} className="glass-button" style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }} onClick={() => { playClickSound(); setShowCategoryModal(true); }}>
              Manage Categories
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onMouseEnter={playHoverSound} className="glass-button" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444' }} onClick={() => { playClickSound(); setShowAddModal(true); }}>
              <Plus size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Add Expenditure
            </motion.button>
          </div>
        )}
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {expenditures.map(exp => (
          <motion.div variants={itemVariants} key={exp.id} className="glass-panel" style={{ padding: '1.5rem' }} onMouseEnter={playHoverSound}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge">{exp.category_name}</span>
                  <span style={{ color: 'var(--danger)', fontSize: '1.25rem' }}>-₹{exp.amount}</span>
                </h3>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>{exp.description}</p>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Date: {new Date(exp.date).toLocaleDateString()}
                </div>
              </div>
              
              {isAdmin && (
                <div style={{ textAlign: 'right' }}>
                  <motion.button 
                    whileHover={{ scale: 1.08 }} 
                    whileTap={{ scale: 0.92 }} 
                    onMouseEnter={playHoverSound} 
                    className="glass-button" 
                    title="Undo Expenditure" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }} 
                    onClick={() => { playClickSound(); handleUndoExpenditure(exp.id); }}
                  >
                    <Undo2 size={14} /> Undo
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {expenditures.length === 0 && (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No expenditures recorded yet.
          </div>
        )}
      </motion.div>

      {/* Categories Modal */}
      {showCategoryModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>Manage Categories</h2>
              <button className="glass-button" style={{ padding: '0.5rem', background: 'transparent' }} onClick={() => { playClickSound(); setShowCategoryModal(false); }}><X size={24} color="#fff" /></button>
            </div>
            
            <form onSubmit={(e) => { playClickSound(); handleAddCategory(e); }} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
              <input type="text" onFocus={playHoverSound} className="glass-input" placeholder="New Category Name..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} required style={{ flex: 1 }} />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="glass-button">Add</motion.button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {categories.map(cat => (
                <div key={cat._id} className="glass-panel" style={{ padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                  <span>{cat.name}</span>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { playClickSound(); handleDeleteCategory(cat._id); }} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </motion.button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-muted" style={{ textAlign: 'center' }}>No categories created.</p>}
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Add Expenditure Modal */}
      {showAddModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>Log Expenditure</h2>
              <button className="glass-button" style={{ padding: '0.5rem', background: 'transparent' }} onClick={() => { playClickSound(); setShowAddModal(false); }}><X size={24} color="#fff" /></button>
            </div>
            
            {categories.length === 0 ? (
              <div style={{ color: '#f59e0b', marginBottom: '1rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                Please create an Expenditure Category first before logging an expenditure!
              </div>
            ) : (
              <form onSubmit={(e) => { playClickSound(); handleAddExpenditure(e); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Date *</label>
                  <input type="date" onFocus={playHoverSound} className="glass-input" value={newExpDate} onChange={e => setNewExpDate(e.target.value)} required />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Category *</label>
                  <select className="glass-input" value={newExpCategoryId} onChange={e => setNewExpCategoryId(e.target.value)} required>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id} style={{ background: '#1e293b' }}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Amount (₹) *</label>
                  <input type="number" min="1" step="1" onFocus={playHoverSound} className="glass-input" placeholder="e.g. 5000" value={newExpAmount} onChange={e => setNewExpAmount(e.target.value)} required />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Description *</label>
                  <input type="text" onFocus={playHoverSound} className="glass-input" placeholder="What was this for?" value={newExpDescription} onChange={e => setNewExpDescription(e.target.value)} required />
                </div>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onMouseEnter={playHoverSound} type="submit" className="glass-button" style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444' }}>
                  Log & Deduct from Balance
                </motion.button>
              </form>
            )}
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
