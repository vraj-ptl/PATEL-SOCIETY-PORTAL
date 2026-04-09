import React, { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileText, Filter } from 'lucide-react';
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

  const [instStartMonth, setInstStartMonth] = useState(currentMonth.toString());
  const [instStartYear, setInstStartYear] = useState(currentYear.toString());
  const [instEndMonth, setInstEndMonth] = useState(currentMonth.toString());
  const [instEndYear, setInstEndYear] = useState(currentYear.toString());

  const [expStart, setExpStart] = useState('');
  const [expEnd, setExpEnd] = useState('');

  const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const fetchReportData = useCallback(async (tab) => {
    const currentTab = tab || activeTab;
    setLoading(true);
    try {
      // Helper to sort data by account_no numerically
      const sortByAccountNo = (arr) => [...arr].sort((a, b) => {
        const numA = parseInt(a.account_no, 10);
        const numB = parseInt(b.account_no, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return String(a.account_no).localeCompare(String(b.account_no));
      });

      if (currentTab === 'loans') {
        const params = {};
        if (loanStart && loanEnd) {
            params.startDate = loanStart;
            params.endDate = loanEnd;
        }
        const res = await axios.get('/api/reports/loans', { params });
        setData(sortByAccountNo(res.data));
      } else if (currentTab === 'fees') {
        const params = {
            startMonth: feeStartMonth, startYear: feeStartYear,
            endMonth: feeEndMonth, endYear: feeEndYear
        };
        const res = await axios.get('/api/reports/pending-fees', { params });
        setData(sortByAccountNo(res.data));
      } else if (currentTab === 'installments') {
        const params = {
          startMonth: instStartMonth,
          startYear: instStartYear,
          endMonth: instEndMonth,
          endYear: instEndYear
        };
        const res = await axios.get('/api/reports/pending-installments', { params });
        setData(sortByAccountNo(res.data));
      } else if (currentTab === 'expenditures') {
        const params = {};
        if (expStart && expEnd) {
            params.startDate = expStart;
            params.endDate = expEnd;
        }
        const res = await axios.get('/api/expenditures', { params });
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch report data", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, loanStart, loanEnd, feeStartMonth, feeStartYear, feeEndMonth, feeEndYear, instStartMonth, instStartYear, instEndMonth, instEndYear, expStart, expEnd]);

  const switchTab = (tab) => {
    playClickSound();
    setData([]); // Clear data immediately to prevent rendering old data with new tab layout
    setActiveTab(tab);
  };

  useEffect(() => {
    fetchReportData(activeTab);
  }, [activeTab]);

  const generatePDF = () => {
    try {
      console.log('generatePDF called, activeTab:', activeTab, 'data length:', data.length);
      const doc = new jsPDF();
      let title = 'Detailed Report';
      let headers = [];
      let tableData = [];

      if (activeTab === 'loans') {
          title = `Loans Issued Report`;
          if (loanStart && loanEnd) title += ` (${loanStart} to ${loanEnd})`;
          headers = [['#', 'Account No', 'Member Name', 'Principal', 'Start Date', 'Total Amount', 'Status']];
          tableData = data.map((loan, i) => [
              i + 1,
              loan.account_no || '', 
              loan.member_name || '', 
              `Rs. ${loan.principal}`,
              `${monthsList[(loan.start_month || 1) - 1]} ${loan.start_year}`,
              `Rs. ${loan.total_amount}`,
              (loan.status || '').toUpperCase()
          ]);
      } else if (activeTab === 'fees') {
          title = `Pending Monthly Fees Report`;
          title += ` (${feeStartMonth}/${feeStartYear} - ${feeEndMonth}/${feeEndYear})`;
          headers = [['#', 'Account No', 'Member Name', 'Pending Months', 'Total Pending', 'Months']];
          tableData = data.map((f, i) => [
              i + 1,
              f.account_no || '',
              f.member_name || '',
              (f.pending_months_count || 0).toString(),
              `Rs. ${f.total_pending_amount || 0}`,
              (f.details || []).join(', ')
          ]);
      } else if (activeTab === 'installments') {
          title = `Pending Loan Installments Report`;
          title += ` (${monthsList[instStartMonth - 1]} ${instStartYear} - ${monthsList[instEndMonth - 1]} ${instEndYear})`;
          headers = [['#', 'Account No', 'Member Name', 'Principal', 'Installment', 'Month', 'Amount Due']];
          
          let rowCount = 0;
          data.forEach(item => {
              (item.pending_installments || []).forEach(inst => {
                  rowCount++;
                  tableData.push([
                      rowCount,
                      item.account_no || '',
                      item.member_name || '',
                      `Rs. ${item.loan_principal}`,
                      `#${inst.installment_no}`,
                      inst.month_label || '',
                      `Rs. ${inst.amount_due}`
                  ]);
              });
          });
      } else if (activeTab === 'expenditures') {
          title = `Society Expenditures Report`;
          if (expStart && expEnd) title += ` (${expStart} to ${expEnd})`;
          headers = [['#', 'Date', 'Category', 'Description', 'Amount']];
          tableData = data.map((exp, i) => [
              i + 1,
              new Date(exp.date).toLocaleDateString('en-IN'),
              exp.category_name,
              exp.description,
              `Rs. ${exp.amount}`
          ]);
      }

      // Title
      doc.setFontSize(16);
      doc.text(title, 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);
      
      autoTable(doc, {
          startY: 35,
          head: headers,
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [139, 92, 246] },
          styles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [245, 245, 255] }
      });

      const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      console.log('Saving PDF as:', fileName);
      
      // Create a blob from the PDF and force the browser to download it using an anchor tag.
      // This is more reliable than doc.save() which can silently fail in some browser configurations.
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL after a short delay to ensure the download starts
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      
      console.log('PDF save forced via Blob URL successfully');
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Error generating PDF: ' + err.message);
    }
  };

  const renderFilters = () => {
    // Shared month/year range filter UI
    const renderMonthYearRange = (sMonth, setSMonth, sYear, setSYear, eMonth, setEMonth, eYear, setEYear) => (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>From:</label>
          <select className="glass-input" style={{ width: '130px' }} value={sMonth} onChange={e => setSMonth(e.target.value)}>
            {monthsList.map((m, i) => <option key={i} value={i + 1} style={{ background: '#1e293b' }}>{m}</option>)}
          </select>
          <input type="number" min="2018" max="2100" className="glass-input" style={{ width: '90px' }} value={sYear} onChange={e => setSYear(e.target.value)} />
        </div>
        <span style={{ color: 'var(--text-muted)' }}>to</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>To:</label>
          <select className="glass-input" style={{ width: '130px' }} value={eMonth} onChange={e => setEMonth(e.target.value)}>
            {monthsList.map((m, i) => <option key={i} value={i + 1} style={{ background: '#1e293b' }}>{m}</option>)}
          </select>
          <input type="number" min="2018" max="2100" className="glass-input" style={{ width: '90px' }} value={eYear} onChange={e => setEYear(e.target.value)} />
        </div>
      </div>
    );

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

            {activeTab === 'fees' && renderMonthYearRange(
              feeStartMonth, setFeeStartMonth, feeStartYear, setFeeStartYear,
              feeEndMonth, setFeeEndMonth, feeEndYear, setFeeEndYear
            )}

            {activeTab === 'installments' && renderMonthYearRange(
              instStartMonth, setInstStartMonth, instStartYear, setInstStartYear,
              instEndMonth, setInstEndMonth, instEndYear, setInstEndYear
            )}

            {activeTab === 'expenditures' && (
                <>
                    <input type="date" className="glass-input" value={expStart} onChange={e => setExpStart(e.target.value)} style={{ width: 'auto' }} />
                    <span style={{ color: 'var(--text-muted)' }}>to</span>
                    <input type="date" className="glass-input" value={expEnd} onChange={e => setExpEnd(e.target.value)} style={{ width: 'auto' }} />
                </>
            )}

            <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="glass-button" 
                onClick={() => { playClickSound(); fetchReportData(); }} 
                onMouseEnter={playHoverSound}
            >
                Apply Filters
            </motion.button>
        </div>
    );
  };

  const renderPDFButton = () => {
    if (data.length === 0) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', marginBottom: '1rem' }}>
        <button 
            className="glass-button" 
            onClick={() => { console.log('PDF button clicked!'); generatePDF(); }}
            style={{ 
                background: 'rgba(139, 92, 246, 0.3)', 
                border: '2px solid #8b5cf6', 
                color: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                cursor: 'pointer',
                borderRadius: '12px'
            }}
        >
            <Download size={20} /> Export as PDF
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
        </div>

        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.5rem', overflowX: 'auto' }}>
            <button 
                className={`glass-button ${activeTab === 'loans' ? 'active' : ''}`}
                style={{ background: activeTab === 'loans' ? 'var(--accent)' : 'transparent', border: 'none' }}
                onClick={() => switchTab('loans')}
            >
                Loans Issued
            </button>
            <button 
                className={`glass-button ${activeTab === 'fees' ? 'active' : ''}`}
                style={{ background: activeTab === 'fees' ? 'var(--accent)' : 'transparent', border: 'none' }}
                onClick={() => switchTab('fees')}
            >
                Pending Monthly Fees
            </button>
            <button 
                className={`glass-button ${activeTab === 'installments' ? 'active' : ''}`}
                style={{ background: activeTab === 'installments' ? 'var(--accent)' : 'transparent', border: 'none' }}
                onClick={() => switchTab('installments')}
            >
                Remaining Installments
            </button>
            <button 
                className={`glass-button ${activeTab === 'expenditures' ? 'active' : ''}`}
                style={{ background: activeTab === 'expenditures' ? 'var(--accent)' : 'transparent', border: 'none' }}
                onClick={() => switchTab('expenditures')}
            >
                Expenditures
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
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>#</th>
                            {activeTab !== 'expenditures' && <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Account No</th>}
                            {activeTab !== 'expenditures' && <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Member</th>}
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
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Installment</th>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Month</th>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Amount Due</th>
                                </>
                            )}
                            {activeTab === 'expenditures' && (
                                <>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Date</th>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Category</th>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Description</th>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Amount</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {activeTab === 'loans' && data.map((loan, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
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
                                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
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

                        {activeTab === 'installments' && (() => {
                            let rowNum = 0;
                            return data.flatMap((item, i) => 
                                item.pending_installments.map((inst, j) => {
                                    rowNum++;
                                    return (
                                        <tr key={`${i}-${j}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{rowNum}</td>
                                            <td style={{ padding: '1rem' }}>{item.account_no}</td>
                                            <td style={{ padding: '1rem' }}>{item.member_name}</td>
                                            <td style={{ padding: '1rem', color: '#8b5cf6' }}>₹{item.loan_principal}</td>
                                            <td style={{ padding: '1rem' }}>#{inst.installment_no}</td>
                                            <td style={{ padding: '1rem' }}>{inst.month_label}</td>
                                            <td style={{ padding: '1rem', color: 'var(--danger)', fontWeight: 'bold' }}>₹{inst.amount_due}</td>
                                        </tr>
                                    );
                                })
                            );
                        })()}
                        {activeTab === 'expenditures' && data.map((exp, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                                <td style={{ padding: '1rem' }}>{new Date(exp.date).toLocaleDateString('en-IN')}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>{exp.category_name}</span>
                                </td>
                                <td style={{ padding: '1rem', maxWidth: '300px' }}>{exp.description}</td>
                                <td style={{ padding: '1rem', color: 'var(--danger)', fontWeight: 'bold' }}>₹{exp.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>

        {renderPDFButton()}
    </motion.div>
  );
}
