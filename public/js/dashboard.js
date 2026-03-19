// Dashboard page logic

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('navbar').innerHTML = getNavbarHTML();

    const user = await Auth.checkLogin();
    if (!user) return;

    setupNavigation();
    loadDashboard();
});

async function loadDashboard() {
    try {
        const data = await API.get('/api/dashboard');

        document.getElementById('totalBalance').textContent = formatCurrency(data.total_balance);
        document.getElementById('pendingLoans').textContent = formatCurrency(data.total_pending_loans);
        document.getElementById('activeLoans').textContent = data.active_loans;
        document.getElementById('totalMembers').textContent = data.total_members;
        document.getElementById('totalAccounts').textContent = data.total_accounts;
        document.getElementById('completedLoans').textContent = data.completed_loans;
    } catch (err) {
        showToast('Failed to load dashboard data', 'error');
    }
}

function openBalanceModal() {
    const balanceText = document.getElementById('totalBalance').textContent;
    const currentBalance = parseInt(balanceText.replace(/[₹,]/g, '')) || 0;
    document.getElementById('balanceInput').value = currentBalance;
    openModal('balanceModal');
}

async function updateBalance() {
    const balance = parseInt(document.getElementById('balanceInput').value);
    if (isNaN(balance)) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    try {
        await API.put('/api/dashboard/balance', { total_balance: balance });
        closeModal('balanceModal');
        showToast('Balance updated successfully', 'success');
        loadDashboard();
    } catch (err) {
        showToast(err.message, 'error');
    }
}
