require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const MongoStore = require('connect-mongo');

const mongoose = require('mongoose');

// Middleware
app.use(cors({ 
    origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173', 
    credentials: true 
})); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup (sharing the Mongoose connection)
app.use(session({
    secret: process.env.SESSION_SECRET || 'patel-society-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        client: mongoose.connection.getClient ? mongoose.connection.getClient() : mongoose.connection.client,
        dbName: 'society'
    }),
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// Connection Status Endpoint for Debugging
app.get('/api/status', (req, res) => {
    const isConnected = mongoose.connection.readyState === 1;
    res.json({
        status: isConnected ? 'Connected' : 'Disconnected',
        database: isConnected ? 'MongoDB' : 'None',
        environment: process.env.NODE_ENV || 'development',
        vercel: !!process.env.VERCEL,
        session_store: 'MongoStore'
    });
});

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

// Start local server if not in Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { initializeDatabase } = require('./database');
    initializeDatabase().then(() => {
        app.listen(PORT, () => {
            console.log(`\n  🏛️  Patel Society Portal Server (MongoDB Version)`);
            console.log(`  ═══════════════════════════════`);
            console.log(`  🌐 Running at: http://localhost:${PORT}`);
            console.log(`  👤 Admin Login: admin / admin123\n`);
        });
    }).catch(err => {
        console.error('Failed to start local server:', err);
    });
}

// Export the Express API for Vercel
module.exports = app;
