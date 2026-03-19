/* ===== API Utilities & Shared Logic ===== */

const API = {
    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: { 'Content-Type': 'application/json' },
                ...options
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            return data;
        } catch (err) {
            throw err;
        }
    },

    get(url) { return this.request(url); },

    post(url, body) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    put(url, body) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    delete(url) {
        return this.request(url, { method: 'DELETE' });
    }
};

// ===== Auth State =====
const Auth = {
    user: null,

    async checkLogin() {
        try {
            const data = await API.get('/api/auth/me');
            this.user = data.user;
            return this.user;
        } catch {
            // Not logged in — redirect to login
            if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
                window.location.href = '/index.html';
            }
            return null;
        }
    },

    isAdmin() {
        return this.user && this.user.role === 'admin';
    },

    async logout() {
        await API.post('/api/auth/logout');
        window.location.href = '/index.html';
    }
};

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ===== Modal Helpers =====
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

// Close modals on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ===== Format Currency =====
function formatCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN');
}

// ===== Navigation Setup =====
function setupNavigation() {
    // Highlight active nav link
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.nav-links a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        }
    });

    // Mobile toggle
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggle && navLinks) {
        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }

    // User badge
    if (Auth.user) {
        const badge = document.querySelector('.nav-user-badge');
        if (badge) {
            badge.textContent = `${Auth.user.role === 'admin' ? '👑' : '👤'} ${Auth.user.username}`;
        }
    }

    // Logout button
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => Auth.logout());
    }

    // Hide admin-only elements for members
    if (!Auth.isAdmin()) {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
}

// ===== Navbar HTML (injected into pages) =====
function getNavbarHTML() {
    return `
    <nav class="navbar">
        <div class="nav-container">
            <div class="nav-brand">
                <div class="nav-brand-icon">🏛️</div>
                <span>Patel Society</span>
            </div>
            <div class="nav-toggle">
                <span></span><span></span><span></span>
            </div>
            <ul class="nav-links">
                <li><a href="dashboard.html">📊 Dashboard</a></li>
                <li><a href="members.html">👥 Members</a></li>
                <li><a href="loans.html">💰 Loans</a></li>
            </ul>
            <div class="nav-user">
                <span class="nav-user-badge"></span>
                <button class="btn-logout">Logout</button>
            </div>
        </div>
    </nav>`;
}
