import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Download, FileText, Calendar, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { playHoverSound, playClickSound } from '../utils/sounds';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('loans');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  // Filters
  const [loanStart, setLoanStart] = useState('');
  const [loanEnd, setLoanEnd] = useState('');
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [feeStartMonth, setFeeStartMonth] = useState('8');
  const [feeStartYear, setFeeStartYear] = useState('2018');
  const [feeEndMonth, setFeeEndMonth] = useState(currentMonth.toString());
  const [feeEndYear, setFeeEndYear] = useState(currentYear.toString());

  const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [instMonthLabel, setInstMonthLabel] = useState(`${monthsList[new Date().getMonth()]} ${new Date().getFullYear()}`);

  useEffect(() => {
    fetchReportData();
  }, [activeTab]);

  const fetchReportData = async () => {
    setLoading(true);
    setData([]);
    try {
      if (activeTab === 'loans') {
        const params = {};
        if (loanStart && loanEnd) {
            params.startDate = loanStart;
            params.endDate = loanEnd;
        }
        const res = await axios.get('/api/reports/loans', { params });
        setData(res.data);
      } else if (activeTab === 'fees') {
        const params = {
            startMonth: feeStartMonth, startYear: feeStartYear,
            endMonth: feeEndMonth, endYear: feeEndYear
        };
        const res = await axios.get('/api/reports/pending-fees', { params });
        setData(res.data);
      } else if (activeTab === 'installments') {
        const params = { monthLabel: instMonthLabel };
        const res = await axios.get('/api/reports/pending-installments', { params });
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch report data", err);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    playClickSound();
    const doc = new jsPDF();
    let title = 'Detailed Report';
    let headers = [];
    let tableData = [];

    if (activeTab === 'loans') {
        title = `Loans Issued Report`;
        if (loanStart && loanEnd) title += ` (${loanStart} to ${loanEnd})`;
        headers = [['Account No', 'Member Name', 'Principal', 'Start Date', 'Total Amount', 'Status']];
        tableData = data.map(loan => [
            loan.account_no, 
            loan.member_name, 
            `Rs. ${loan.principal}`,
            `${monthsList[loan.start_month - 1]} ${loan.start_year}`,
            `Rs. ${loan.total_amount}`,
            loan.status.toUpperCase()
        ]);
    } else if (activeTab === 'fees') {
        title = `Pending Monthly Fees`;
        title += ` (${feeStartMonth}/${feeStartYear} - ${feeEndMonth}/${feeEndYear})`;
        headers = [['Account No', 'Member Name', 'Pending Months', 'Total Pending', 'Months']];
        tableData = data.map(f => [
            f.account_no,
            f.member_name,
            f.pending_months_count.toString(),
            `Rs. ${f.total_pending_amount}`,
            f.details.join(', ')
        ]);
    } else if (activeTab === 'installments') {
        title = `Pending Loan Installments (${instMonthLabel})`;
        headers = [['Account No', 'Member Name', 'Principal', '# Remaining', 'Amount Due']];
        
        data.forEach(item => {
            const numPending = item.pending_installments.length;
            const totalDue = item.pending_installments.reduce((sum, inst) => sum + inst.amount_due, 0);
            if (numPending > 0) {
                tableData.push([
                    item.account_no,
                    item.member_name,
                    `Rs. ${item.loan_principal}`,
                    numPending.toString(),
                    `Rs. ${totalDue}`
                ]);
            }
        });
    }

    doc.setFontSize(16);
    doc.text(title, 14, 20);
    
    doc.autoTable({
        startY: 30,
        head: headers,
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] }, // match purple accent
        styles: { fontSize: 10 }
    });

    doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };

  // UI Renders
  const renderFilters = () => {
    return (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                <Filter size={20} color="var(--accent)" /> Filters
            </h3>
            
            {activeTab === 'loans' && (
                <>
                    <input type="date" className="glass-input" value={loanStart} onChange={e => setLoanStart(e.target.value)} style={{ width: 'auto' }} />
                    <span style={{ color: 'var(--text-muted)' }}>to</span>
                    <input type="date" className="glass-input" value={loanEnd} onChange={e => setLoanEnd(e.target.value)} style={{ width: 'auto' }} />
                </>
            )}

            {activeTab === 'fees' && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="number" min="1" max="12" placeholder="MM" className="glass-input" style={{ width: '70px' }} value={feeStartMonth} onChange={e => setFeeStartMonth(e.target.value)} />
                    <input type="number" min="2018" max="2100" placeholder="YYYY" className="glass-input" style={{ width: '90px' }} value={feeStartYear} onChange={e => setFeeStartYear(e.target.value)} />
                    <span style={{ color: 'var(--text-muted)' }}>to</span>
                    <input type="number" min="1" max="12" placeholder="MM" className="glass-input" style={{ width: '70px' }} value={feeEndMonth} onChange={e => setFeeEndMonth(e.target.value)} />
                    <input type="number" min="2018" max="2100" placeholder="YYYY" className="glass-input" style={{ width: '90px' }} value={feeEndYear} onChange={e => setFeeEndYear(e.target.value)} />
                </div>
            )}

            {activeTab === 'installments' && (
                <input 
                    type="text" 
                    placeholder="e.g. August 2024" 
                    className="glass-input" 
                    value={instMonthLabel} 
                    onChange={e => setInstMonthLabel(e.target.value)} 
                    style={{ width: '200px' }} 
                />
            )}

            <button className="glass-button" onClick={() => { playClickSound(); fetchReportData(); }} onMouseEnter={playHoverSound}>
                Apply Filters
            </button>
        </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h1 className="text-gradient" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={32} color="var(--accent)" /> Detailed Reports
            </h1>
            
            <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }} 
                className="glass-button" 
                onClick={generatePDF} 
                onMouseEnter={playHoverSound}
                style={{ background: 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                disabled={data.length === 0}
            >
                <Download size={18} /> Export as PDF
            </motion.button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.5rem', overflowX: 'auto' }}>
            <button 
                className={`glass-button ${activeTab === 'loans' ? 'active' : ''}`}
                style={{ background: activeTab === 'loans' ? 'var(--accent)' : 'transparent', border: 'none' }}
                onClick={() => { playClickSound(); setActiveTab('loans'); }}
            >
                Loans Issued
            </button>
            <button 
                className={`glass-button ${activeTab === 'fees' ? 'active' : ''}`}
                style={{ background: activeTab === 'fees' ? 'var(--accent)' : 'transparent', border: 'none' }}
                onClick={() => { playClickSound(); setActiveTab('fees'); }}
            >
                Pending Monthly Fees
            </button>
            <button 
                className={`glass-button ${activeTab === 'installments' ? 'active' : ''}`}
                style={{ background: activeTab === 'installments' ? 'var(--accent)' : 'transparent', border: 'none' }}
                onClick={() => { playClickSound(); setActiveTab('installments'); }}
            >
                Remaining Installments
            </button>
        </div>

        {renderFilters()}

        <div className="glass-panel" style={{ overflowX: 'auto' }}>
            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading report data...</div>
            ) : data.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No data found for the selected filters.</div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Account No</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Member</th>
                            {activeTab === 'loans' && (
                                <>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Principal</th>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Start Month</th>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Total Amount</th>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Status</th>
                                </>
                            )}
                            {activeTab === 'fees' && (
                                <>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Pending Months</th>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Total Due</th>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Details</th>
                                </>
                            )}
                            {activeTab === 'installments' && (
                                <>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Principal</th>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}># Remaining</th>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Total Due</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {activeTab === 'loans' && data.map((loan, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1rem' }}>{loan.account_no}</td>
                                <td style={{ padding: '1rem' }}>{loan.member_name}</td>
                                <td style={{ padding: '1rem', color: '#8b5cf6' }}>₹{loan.principal}</td>
                                <td style={{ padding: '1rem' }}>{monthsList[loan.start_month - 1]} {loan.start_year}</td>
                                <td style={{ padding: '1rem', color: 'var(--danger)' }}>₹{loan.total_amount}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span className="badge" style={{ background: loan.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: loan.status === 'completed' ? 'var(--success)' : 'var(--danger)' }}>
                                        {loan.status}
                                    </span>
                                </td>
                            </tr>
                        ))}

                        {activeTab === 'fees' && data.map((f, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1rem' }}>{f.account_no}</td>
                                <td style={{ padding: '1rem' }}>{f.member_name}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}>
                                        {f.pending_months_count} Months
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--danger)', fontWeight: 'bold' }}>₹{f.total_pending_amount}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.details.join(', ')}>
                                    {f.details.join(', ')}
                                </td>
                            </tr>
                        ))}

                        {activeTab === 'installments' && data.map((item, i) => {
                            const pendingCount = item.pending_installments.length;
                            const totalDue = item.pending_installments.reduce((sum, inst) => sum + inst.amount_due, 0);
                            
                            if (pendingCount === 0) return null;

                            return (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem' }}>{item.account_no}</td>
                                    <td style={{ padding: '1rem' }}>{item.member_name}</td>
                                    <td style={{ padding: '1rem', color: '#8b5cf6' }}>₹{item.loan_principal}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}>
                                            {pendingCount} Installments
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--danger)', fontWeight: 'bold' }}>₹{totalDue}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    </motion.div>
  );
}
