require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true })); // For Vite React Dev Server
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'patel-society-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files from React build (when built)
// app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// API Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const accountRoutes = require('./routes/members');
const loanRoutes = require('./routes/loans');
const feeRoutes = require('./routes/fees');

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/fees', feeRoutes);

// Fallback to React index
/*
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});
*/

// Start server after DB initialization
async function start() {
    const { initializeDatabase } = require('./database');
    await initializeDatabase();

    app.listen(PORT, () => {
        console.log(`\n  🏛️  Patel Society Portal Server (MongoDB Version)`);
        console.log(`  ═══════════════════════════════`);
        console.log(`  🌐 Running at: http://localhost:${PORT}`);
        console.log(`  👤 Admin Login: admin / admin123\n`);
    });
}

start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
