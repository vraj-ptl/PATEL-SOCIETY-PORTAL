require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const MongoStore = require('connect-mongo');

// Middleware
app.use(cors({ 
    origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173', 
    credentials: true 
})); // Allow all origins in production for Vercel, or restrict as needed
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'patel-society-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/society'
    }),
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

// Database initialization for serverless environments
const { initializeDatabase } = require('./database');
initializeDatabase().catch(console.error);

// Export the Express API for Vercel
module.exports = app;

// Start local server if not in Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`\n  🏛️  Patel Society Portal Server (MongoDB Version)`);
        console.log(`  ═══════════════════════════════`);
        console.log(`  🌐 Running at: http://localhost:${PORT}`);
        console.log(`  👤 Admin Login: admin / admin123\n`);
    });
}
