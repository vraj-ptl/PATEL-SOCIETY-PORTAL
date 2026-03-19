// Loans page logic
let allLoans = [];

const LOAN_PLANS = {
    '50000_1': { interest: 1500, total: 51500, installmentCount: 13 },
    '50000_2': { interest: 3000, total: 53000, installmentCount: 25 },
    '100000_1': { interest: 3000, total: 103000, installmentCount: 14 },
    '100000_2': { interest: 6000, total: 106000, installmentCount: 26 }
};

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('navbar').innerHTML = getNavbarHTML();
    const user = await Auth.checkLogin();
    if (!user) return;
    setupNavigation();

    // Set current month as default
    const now = new Date();
    document.getElementById('loanStartMonth').value = now.getMonth() + 1;
    document.getElementById('loanStartYear').value = now.getFullYear();

    loadLoans();
    loadBalanceSummary();
});

async function loadBalanceSummary() {
    try {
        const data = await API.get('/api/dashboard');
        document.getElementById('loanSocietyBalance').textContent = formatCurrency(data.total_balance);
        document.getElementById('loanPendingTotal').textContent = formatCurrency(data.total_pending_loans);
    } catch (err) {
        console.error('Failed to load balance', err);
    }
}

async function loadLoans() {
    const loading = document.getElementById('loansLoading');
    const container = document.getElementById('loansListContainer');
    const emptyState = document.getElementById('loansEmptyState');

    loading.style.display = 'flex';
    container.style.display = 'none';
    emptyState.classList.add('hidden');

    try {
        allLoans = await API.get('/api/loans');
        renderLoans(allLoans);
    } catch (err) {
        showToast('Failed to load loans', 'error');
    } finally {
        loading.style.display = 'none';
    }
}

function renderLoans(loans) {
    const container = document.getElementById('loansListContainer');
    const emptyState = document.getElementById('loansEmptyState');

    if (loans.length === 0) {
        container.style.display = 'none';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    container.style.display = 'block';

    let html = '';
    loans.forEach(loan => {
        const statusBadge = loan.status === 'active'
            ? '<span class="badge badge-active">Active</span>'
            : '<span class="badge badge-completed">Completed</span>';

        const progress = loan.total_amount > 0 ? Math.round((loan.total_paid / loan.total_amount) * 100) : 0;

        html += `
            <div class="card" style="margin: 0 1rem 0.75rem; cursor: pointer;" onclick="toggleLoanDetail(${loan.id})">
                <div class="d-flex justify-between items-center" style="flex-wrap: wrap; gap: 0.75rem;">
                    <div>
                        <div class="d-flex items-center gap-1" style="margin-bottom: 0.25rem;">
                            <span style="font-weight: 700; color: var(--green-light); font-size: 1rem;">${loan.account_no}</span>
                            ${statusBadge}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">
                            ${loan.member_name} · ${formatCurrency(loan.principal)} for ${loan.time_period_years}yr
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Remaining</div>
                        <div style="font-weight: 800; font-size: 1.2rem; color: ${loan.remaining_balance > 0 ? 'var(--gold-light)' : 'var(--green-light)'};">
                            ${formatCurrency(loan.remaining_balance)}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Paid: ${formatCurrency(loan.total_paid)} (${progress}%)</div>
                    </div>
                </div>
                <!-- Progress bar -->
                <div style="margin-top: 0.75rem; height: 4px; background: var(--bg-input); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${progress}%; background: linear-gradient(90deg, var(--green-primary), var(--green-light)); border-radius: 4px; transition: width 0.5s ease;"></div>
                </div>
            </div>
            <div class="loan-detail-panel hidden" id="loanDetail-${loan.id}" style="margin: 0 1rem 1.5rem; padding: 0 0.5rem;">
                <div class="page-loading" id="loanDetailLoading-${loan.id}">
                    <span class="loading-spinner"></span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    if (!Auth.isAdmin()) {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
}

function filterLoans() {
    const status = document.getElementById('statusFilter').value;
    const search = document.getElementById('loanSearch').value.toLowerCase().trim();

    let filtered = allLoans;
    if (status) filtered = filtered.filter(l => l.status === status);
    if (search) filtered = filtered.filter(l =>
        l.account_no.toLowerCase().includes(search) ||
        l.member_name.toLowerCase().includes(search)
    );
    renderLoans(filtered);
}

// === Toggle Loan Detail (Installments) ===
async function toggleLoanDetail(loanId) {
    const panel = document.getElementById(`loanDetail-${loanId}`);
    if (!panel) return;

    if (!panel.classList.contains('hidden')) {
        panel.classList.add('hidden');
        return;
    }

    panel.classList.remove('hidden');
    const loading = document.getElementById(`loanDetailLoading-${loanId}`);
    if (loading) loading.style.display = 'flex';

    try {
        const loan = await API.get(`/api/loans/${loanId}`);
        renderLoanDetail(loan);
    } catch (err) {
        showToast('Failed to load loan details', 'error');
        panel.classList.add('hidden');
    }
}

function renderLoanDetail(loan) {
    const panel = document.getElementById(`loanDetail-${loan.id}`);
    if (!panel) return;

    const paidCount = loan.installments.filter(i => i.is_paid).length;

    let html = `
        <div class="loan-summary">
            <div class="loan-summary-item">
                <div class="loan-summary-label">Principal</div>
                <div class="loan-summary-value text-blue">${formatCurrency(loan.principal)}</div>
            </div>
            <div class="loan-summary-item">
                <div class="loan-summary-label">Interest</div>
                <div class="loan-summary-value text-gold">${formatCurrency(loan.interest)}</div>
            </div>
            <div class="loan-summary-item">
                <div class="loan-summary-label">Total Amount</div>
                <div class="loan-summary-value text-green">${formatCurrency(loan.total_amount)}</div>
            </div>
            <div class="loan-summary-item">
                <div class="loan-summary-label">Total Paid</div>
                <div class="loan-summary-value" style="color: var(--green-light);">${formatCurrency(loan.total_paid)}</div>
            </div>
            <div class="loan-summary-item">
                <div class="loan-summary-label">Remaining</div>
                <div class="loan-summary-value" style="color: ${loan.remaining_balance > 0 ? 'var(--gold-light)' : 'var(--green-light)'};">
                    ${formatCurrency(loan.remaining_balance)}
                </div>
            </div>
            <div class="loan-summary-item">
                <div class="loan-summary-label">Progress</div>
                <div class="loan-summary-value text-blue">${paidCount}/${loan.installments.length}</div>
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h4 style="font-size: 0.9rem; color: var(--text-secondary);">Installment Schedule</h4>
            <button class="btn btn-sm btn-danger admin-only" onclick="deleteLoanConfirm(${loan.id})">🗑️ Delete Loan</button>
        </div>

        <div class="installment-grid">
    `;

    loan.installments.forEach(inst => {
        const isPaid = inst.is_paid;
        html += `
            <div class="installment-row ${isPaid ? 'paid' : ''}">
                <div class="installment-no">#${inst.installment_no}</div>
                <div class="installment-month">${inst.month_label}</div>
                <div class="installment-amount">${formatCurrency(inst.default_amount)}</div>
                <div style="text-align: right; font-size: 0.85rem;">
                    ${isPaid
                        ? `<span style="color: var(--green-light); font-weight: 600;">${formatCurrency(inst.paid_amount)} paid</span>`
                        : `<button class="btn btn-sm btn-primary admin-only" onclick="openPayModal(${loan.id}, ${inst.installment_no}, '${inst.month_label}', ${inst.default_amount})">Pay</button>`
                    }
                </div>
                <div class="installment-status">
                    ${isPaid
                        ? '<span class="badge badge-paid">✓ Paid</span>'
                        : '<span class="badge badge-unpaid">Pending</span>'
                    }
                </div>
            </div>
        `;
    });

    html += '</div>';
    panel.innerHTML = html;

    if (!Auth.isAdmin()) {
        panel.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
}

// === New Loan Modal ===
function openNewLoanModal() {
    document.getElementById('loanAccountNo').value = '';
    document.getElementById('loanPrincipal').value = '';
    document.getElementById('loanPeriod').value = '';
    document.getElementById('loanPreview').classList.add('hidden');
    openModal('newLoanModal');
}

function updateLoanPreview() {
    const principal = document.getElementById('loanPrincipal').value;
    const period = document.getElementById('loanPeriod').value;
    const preview = document.getElementById('loanPreview');

    if (!principal || !period) {
        preview.classList.add('hidden');
        return;
    }

    const plan = LOAN_PLANS[`${principal}_${period}`];
    if (!plan) return;

    document.getElementById('previewInterest').textContent = formatCurrency(plan.interest);
    document.getElementById('previewTotal').textContent = formatCurrency(plan.total);
    document.getElementById('previewInstallments').textContent = plan.installmentCount;
    preview.classList.remove('hidden');
}

async function createLoan() {
    const account_no = document.getElementById('loanAccountNo').value.trim();
    const principal = parseInt(document.getElementById('loanPrincipal').value);
    const time_period_years = parseInt(document.getElementById('loanPeriod').value);
    const start_month = parseInt(document.getElementById('loanStartMonth').value);
    const start_year = parseInt(document.getElementById('loanStartYear').value);

    if (!account_no || !principal || !time_period_years || !start_month || !start_year) {
        showToast('Please fill all fields', 'error');
        return;
    }

    try {
        await API.post('/api/loans', { account_no, principal, time_period_years, start_month, start_year });
        closeModal('newLoanModal');
        showToast('Loan created successfully!', 'success');
        loadLoans();
        loadBalanceSummary();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// === Pay Installment ===
function openPayModal(loanId, installmentNo, monthLabel, defaultAmount) {
    document.getElementById('payLoanId').value = loanId;
    document.getElementById('payInstallmentNo').value = installmentNo;
    document.getElementById('payInstallmentInfo').textContent = `#${installmentNo} — ${monthLabel}`;
    document.getElementById('payDefaultAmount').textContent = formatCurrency(defaultAmount);
    document.getElementById('payAmount').value = defaultAmount;
    openModal('payModal');
}

async function submitPayment() {
    const loanId = document.getElementById('payLoanId').value;
    const installmentNo = document.getElementById('payInstallmentNo').value;
    const paidAmount = parseInt(document.getElementById('payAmount').value);

    if (isNaN(paidAmount) || paidAmount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    try {
        const loan = await API.put(`/api/loans/${loanId}/installments/${installmentNo}`, { paid_amount: paidAmount });
        closeModal('payModal');
        showToast('Payment recorded!', 'success');

        // Re-render the detail panel
        renderLoanDetail(loan);

        // Refresh loan list and balance
        loadLoans();
        loadBalanceSummary();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// === Delete Loan ===
async function deleteLoanConfirm(loanId) {
    if (!confirm('Are you sure you want to delete this loan? This action cannot be undone.')) return;
    try {
        await API.delete(`/api/loans/${loanId}`);
        showToast('Loan deleted', 'success');
        loadLoans();
        loadBalanceSummary();
    } catch (err) {
        showToast(err.message, 'error');
    }
}
