// Members page logic
let allAccounts = [];

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('navbar').innerHTML = getNavbarHTML();
    const user = await Auth.checkLogin();
    if (!user) return;
    setupNavigation();
    loadAccounts();
});

async function loadAccounts() {
    const loading = document.getElementById('membersLoading');
    const desktopTable = document.getElementById('desktopTable');
    const emptyState = document.getElementById('emptyState');

    loading.style.display = 'flex';
    desktopTable.style.display = 'none';
    emptyState.classList.add('hidden');

    try {
        allAccounts = await API.get('/api/accounts');
        renderAccounts(allAccounts);
    } catch (err) {
        showToast('Failed to load accounts', 'error');
    } finally {
        loading.style.display = 'none';
    }
}

function renderAccounts(accounts) {
    const tbody = document.getElementById('membersBody');
    const mobileCards = document.getElementById('mobileCards');
    const desktopTable = document.getElementById('desktopTable');
    const emptyState = document.getElementById('emptyState');

    if (accounts.length === 0) {
        desktopTable.style.display = 'none';
        emptyState.classList.remove('hidden');
        mobileCards.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');
    desktopTable.style.display = 'block';

    // Desktop table
    let tableHTML = '';
    accounts.forEach(acc => {
        acc.members.forEach((member, idx) => {
            tableHTML += `
                <tr>
                    ${idx === 0 ? `<td rowspan="${acc.members.length}" style="font-weight:700; color: var(--green-light); vertical-align: top;">${acc.account_no}</td>` : ''}
                    <td style="color: var(--text-primary); font-weight: 500;">${member.name}</td>
                    <td>${member.village}</td>
                    <td>${member.phone}</td>
                    ${idx === 0 ? `<td rowspan="${acc.members.length}" style="vertical-align: top;">${acc.members.length}/6</td>` : ''}
                    ${idx === 0 ? `
                        <td rowspan="${acc.members.length}" class="admin-only" style="vertical-align: top;">
                            <div class="d-flex gap-1">
                                ${acc.members.length < 6 ? `<button class="btn-icon" title="Add Member" onclick="openAddSingleMember('${acc.account_no}')">+</button>` : ''}
                                <button class="btn-icon" title="Edit" onclick="openEditMember(${member.id}, '${member.name}', '${member.village}', '${member.phone}')">✏️</button>
                                <button class="btn-icon danger" title="Delete Account" onclick="deleteAccount('${acc.account_no}')">🗑️</button>
                            </div>
                        </td>
                    ` : `
                        <td class="admin-only" style="display:none;">
                            <div class="d-flex gap-1">
                                <button class="btn-icon" title="Edit" onclick="openEditMember(${member.id}, '${member.name}', '${member.village}', '${member.phone}')">✏️</button>
                                <button class="btn-icon danger" title="Delete Member" onclick="deleteMember(${member.id})">✕</button>
                            </div>
                        </td>
                    `}
                </tr>
            `;
        });
    });
    tbody.innerHTML = tableHTML;

    // Mobile cards
    let cardsHTML = '';
    accounts.forEach(acc => {
        cardsHTML += `
            <div class="member-card">
                <div class="member-card-header">
                    <span class="member-card-acc">${acc.account_no}</span>
                    <div class="member-card-actions admin-only">
                        ${acc.members.length < 6 ? `<button class="btn btn-sm btn-secondary" onclick="openAddSingleMember('${acc.account_no}')">+ Add</button>` : ''}
                        <button class="btn btn-sm btn-danger" onclick="deleteAccount('${acc.account_no}')">Delete</button>
                    </div>
                </div>
                ${acc.members.map(m => `
                    <div class="member-card-row" style="padding: 0.5rem; background: var(--bg-input); border-radius: 6px; margin-bottom: 4px;">
                        <div>
                            <div style="font-weight: 600; color: var(--text-primary);">${m.name}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${m.village} · ${m.phone}</div>
                        </div>
                        <div class="d-flex gap-1 admin-only">
                            <button class="btn-icon" style="width: 28px; height: 28px; font-size: 0.7rem;" onclick="openEditMember(${m.id}, '${m.name}', '${m.village}', '${m.phone}')">✏️</button>
                            <button class="btn-icon danger" style="width: 28px; height: 28px; font-size: 0.7rem;" onclick="deleteMember(${m.id})">✕</button>
                        </div>
                    </div>
                `).join('')}
                <div class="text-muted" style="font-size: 0.75rem; margin-top: 0.5rem; text-align: right;">${acc.members.length}/6 members</div>
            </div>
        `;
    });
    mobileCards.innerHTML = cardsHTML;

    // Hide admin actions for non-admin users
    if (!Auth.isAdmin()) {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
}

function filterAccounts() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!query) {
        renderAccounts(allAccounts);
        return;
    }
    const filtered = allAccounts.filter(acc =>
        acc.account_no.toLowerCase().includes(query) ||
        acc.members.some(m => m.name.toLowerCase().includes(query) || m.village.toLowerCase().includes(query))
    );
    renderAccounts(filtered);
}

// === Add Account Modal ===
let memberFieldCount = 0;

function openAddAccountModal() {
    document.getElementById('accountNo').value = '';
    document.getElementById('accUsername').value = '';
    document.getElementById('accPassword').value = '';
    document.getElementById('memberFields').innerHTML = '';
    memberFieldCount = 0;
    addMemberField(); // Start with 1 member
    openModal('addAccountModal');
}

function addMemberField() {
    if (memberFieldCount >= 6) {
        showToast('Maximum 6 members per account', 'info');
        return;
    }
    memberFieldCount++;
    const container = document.getElementById('memberFields');
    const div = document.createElement('div');
    div.className = 'member-field-group';
    div.style.cssText = 'padding: 0.75rem; background: var(--bg-input); border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid var(--border-color);';
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--green-light);">Member ${memberFieldCount}</span>
            ${memberFieldCount > 1 ? `<button type="button" class="btn-icon danger" style="width: 24px; height: 24px; font-size: 0.7rem;" onclick="removeMemberField(this)">✕</button>` : ''}
        </div>
        <div class="form-row" style="margin-bottom: 0.5rem;">
            <input class="form-input member-name" type="text" placeholder="Name" required>
            <input class="form-input member-village" type="text" placeholder="Village" required>
        </div>
        <input class="form-input member-phone" type="text" placeholder="Phone Number" required>
    `;
    container.appendChild(div);
    updateMemberNumbers();
}

function removeMemberField(btn) {
    btn.closest('.member-field-group').remove();
    memberFieldCount--;
    updateMemberNumbers();
}

function updateMemberNumbers() {
    document.querySelectorAll('.member-field-group').forEach((group, idx) => {
        const label = group.querySelector('span');
        if (label) label.textContent = `Member ${idx + 1}`;
    });
}

async function saveAccount() {
    const accountNo = document.getElementById('accountNo').value.trim();
    const username = document.getElementById('accUsername').value.trim();
    const password = document.getElementById('accPassword').value;

    if (!accountNo) {
        showToast('Account number is required', 'error');
        return;
    }

    const memberGroups = document.querySelectorAll('.member-field-group');
    const members = [];
    for (const group of memberGroups) {
        const name = group.querySelector('.member-name').value.trim();
        const village = group.querySelector('.member-village').value.trim();
        const phone = group.querySelector('.member-phone').value.trim();
        if (!name || !village || !phone) {
            showToast('All member fields are required', 'error');
            return;
        }
        members.push({ name, village, phone });
    }

    try {
        await API.post('/api/accounts', {
            account_no: accountNo,
            members,
            username: username || undefined,
            password: password || undefined
        });
        closeModal('addAccountModal');
        showToast('Account created successfully!', 'success');
        loadAccounts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// === Edit Member ===
function openEditMember(id, name, village, phone) {
    document.getElementById('editMemberId').value = id;
    document.getElementById('editName').value = name;
    document.getElementById('editVillage').value = village;
    document.getElementById('editPhone').value = phone;
    openModal('editMemberModal');
}

async function updateMember() {
    const id = document.getElementById('editMemberId').value;
    const name = document.getElementById('editName').value.trim();
    const village = document.getElementById('editVillage').value.trim();
    const phone = document.getElementById('editPhone').value.trim();

    if (!name || !village || !phone) {
        showToast('All fields are required', 'error');
        return;
    }

    try {
        await API.put(`/api/accounts/${id}`, { name, village, phone });
        closeModal('editMemberModal');
        showToast('Member updated', 'success');
        loadAccounts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// === Add Single Member ===
function openAddSingleMember(accountNo) {
    document.getElementById('addToAccountNo').value = accountNo;
    document.getElementById('addToAccNo').textContent = accountNo;
    document.getElementById('newMemberName').value = '';
    document.getElementById('newMemberVillage').value = '';
    document.getElementById('newMemberPhone').value = '';
    openModal('addSingleMemberModal');
}

async function addSingleMember() {
    const accountNo = document.getElementById('addToAccountNo').value;
    const name = document.getElementById('newMemberName').value.trim();
    const village = document.getElementById('newMemberVillage').value.trim();
    const phone = document.getElementById('newMemberPhone').value.trim();

    if (!name || !village || !phone) {
        showToast('All fields are required', 'error');
        return;
    }

    try {
        await API.post(`/api/accounts/${accountNo}/members`, { name, village, phone });
        closeModal('addSingleMemberModal');
        showToast('Member added', 'success');
        loadAccounts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// === Delete ===
async function deleteMember(id) {
    if (!confirm('Are you sure you want to delete this member?')) return;
    try {
        await API.delete(`/api/accounts/member/${id}`);
        showToast('Member deleted', 'success');
        loadAccounts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteAccount(accountNo) {
    if (!confirm(`Delete entire account ${accountNo} and all its members?`)) return;
    try {
        await API.delete(`/api/accounts/${accountNo}`);
        showToast('Account deleted', 'success');
        loadAccounts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}
