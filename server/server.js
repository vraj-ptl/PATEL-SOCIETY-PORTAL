require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const connectMongo = require('connect-mongo');
const MongoStore = connectMongo.MongoStore || connectMongo.default || connectMongo;

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Vercel's proxy (required for secure cookies to work behind HTTPS proxy)
app.set('trust proxy', 1);

// The MongoDB URI (used for both DB and session store)
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/society';

// --- Middleware ---
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session store: connect-mongo creates its OWN connection using the URI string.
const sessionStore = typeof MongoStore.create === 'function'
    ? MongoStore.create({ mongoUrl: MONGO_URI, collectionName: 'sessions' })
    : new MongoStore({ mongoUrl: MONGO_URI, collectionName: 'sessions' });

app.use(session({
    secret: process.env.SESSION_SECRET || 'patel-society-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// --- Status Endpoint (for debugging connectivity) ---
app.get('/api/status', async (req, res) => {
    const mongoose = require('mongoose');
    res.json({
        status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        readyState: mongoose.connection.readyState,
        mongoUri: MONGO_URI ? 'Set' : 'MISSING',
        environment: process.env.NODE_ENV || 'development',
        vercel: !!process.env.VERCEL
    });
});

// --- API Routes ---
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const accountRoutes = require('./routes/members');
const loanRoutes = require('./routes/loans');
const feeRoutes = require('./routes/fees');
const reportRoutes = require('./routes/reports');
const expenditureRoutes = require('./routes/expenditures');

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/expenditures', expenditureRoutes);

// --- Local Development Server ---
if (!process.env.VERCEL) {
    const { initializeDatabase } = require('./database');
    initializeDatabase().then(() => {
        app.listen(PORT, () => {
            console.log(`\n  🏛️  Patel Society Portal Server`);
            console.log(`  ═══════════════════════════════`);
            console.log(`  🌐 Running at: http://localhost:${PORT}`);
            console.log(`  👤 Admin Login: admin / admin123\n`);
        });
    }).catch(err => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });
}

// Export for Vercel
module.exports = app;
