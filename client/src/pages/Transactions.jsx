import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, List, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { playHoverSound, playClickSound } from '../utils/sounds';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate && endDate) {
          params.startDate = startDate;
          params.endDate = endDate;
      }
      const res = await axios.get('/api/transactions', { params });
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      let title = 'Global Audit & Transaction Log';
      if (startDate && endDate) title += ` (${startDate} to ${endDate})`;
      
      const headers = [['Date', 'Type', 'Description', 'Amount', 'Before', 'After']];
      
      const tableData = transactions.map(t => [
          new Date(t.recorded_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
          t.type.replace(/_/g, ' '),
          t.description,
          `${t.is_deduction ? '-' : '+'} Rs. ${t.amount}`,
          `Rs. ${t.balance_before}`,
          `Rs. ${t.balance_after}`
      ]);

      doc.setFontSize(16);
      doc.text(title, 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 28);
      
      autoTable(doc, {
          startY: 35,
          head: headers,
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }, // Blue primary color
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            2: { cellWidth: 60 } // wider description column
          },
          alternateRowStyles: { fillColor: [240, 248, 255] }
      });

      const fileName = `transactions_log_${new Date().getTime()}.pdf`;
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h1 className="text-gradient" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <List size={32} color="var(--accent)" /> Audit Log
            </h1>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={20} color="var(--accent)" /> Date Filter
            </h3>
            <input type="date" className="glass-input" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 'auto' }} />
            <span style={{ color: 'var(--text-muted)' }}>to</span>
            <input type="date" className="glass-input" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: 'auto' }} />
            <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="glass-button" 
                onClick={() => { playClickSound(); fetchTransactions(); }} 
                onMouseEnter={playHoverSound}
            >
                Apply
            </motion.button>
        </div>

        <div className="glass-panel" style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading transactions...</div>
            ) : transactions.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found for the selected dates.</div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Date & Time</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Action Type</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Description</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>Amount</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>Before</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>After</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(t => (
                            <tr key={t._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    {new Date(t.recorded_at).toLocaleString('en-IN', {
                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.7rem' }}>
                                        {t.type.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', maxWidth: '300px' }}>{t.description}</td>
                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: t.is_deduction ? 'var(--danger)' : 'var(--success)' }}>
                                    {t.is_deduction ? '-' : '+'}₹{t.amount}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>₹{t.balance_before}</td>
                                <td style={{ padding: '1rem', textAlign: 'right', color: '#fff' }}>₹{t.balance_after}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>

        {transactions.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                <button 
                    className="glass-button" 
                    onClick={() => { playClickSound(); generatePDF(); }}
                    style={{ background: 'rgba(59, 130, 246, 0.3)', border: '2px solid #3b82f6', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', borderRadius: '12px', cursor: 'pointer' }}
                >
                    <Download size={20} /> Export Audit Log
                </button>
            </div>
        )}
    </motion.div>
  );
}
